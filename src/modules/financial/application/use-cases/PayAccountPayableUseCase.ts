import { injectable, inject } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Payment } from '../../domain/entities/Payment';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { PayableNotFoundError } from '../../domain/errors/FinancialErrors';
import { 
  PayAccountPayableInput, 
  PayAccountPayableInputSchema, 
  PayAccountPayableOutput 
} from '../dtos/PayAccountPayableDTO';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Pagar Conta a Pagar
 * 
 * Fluxo:
 * 1. Validar input
 * 2. Buscar payable
 * 3. Validar permissão (multi-tenant)
 * 4. Criar Payment
 * 5. Registrar no Aggregate
 * 6. Confirmar (se autoConfirm)
 * 7. Persistir
 * 8. Retornar resultado
 */
@injectable()
export class PayAccountPayableUseCase implements IUseCaseWithContext<PayAccountPayableInput, PayAccountPayableOutput> {
  private readonly payableRepository: IPayableRepository;

  constructor(
    @inject(TOKENS.PayableRepository) payableRepository: IPayableRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {
    this.payableRepository = payableRepository;
  }

  async execute(
    input: PayAccountPayableInput, 
    ctx: ExecutionContext
  ): Promise<Result<PayAccountPayableOutput, string>> {
    
    // 1. Validar input
    const validation = PayAccountPayableInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Buscar payable
    const payable = await this.payableRepository.findById(data.payableId, ctx.organizationId);
    
    if (!payable) {
      return Result.fail(new PayableNotFoundError(data.payableId).message);
    }

    // 3. Validar permissão de branch
    if (!ctx.isAdmin && payable.branchId !== ctx.branchId) {
      return Result.fail('Access denied: payable belongs to another branch');
    }

    // 4. Criar Money
    const amountResult = Money.create(data.amount, data.currency);
    if (Result.isFail(amountResult)) {
      return Result.fail(`Invalid amount: ${amountResult.error}`);
    }

    // 5. Criar Payment
    const paymentId = this.uuidGenerator.generate();
    const paymentResult = Payment.create({
      id: paymentId,
      payableId: data.payableId,
      amount: amountResult.value,
      method: data.method,
      bankAccountId: data.bankAccountId,
      transactionId: data.transactionId,
      notes: data.notes,
    });

    if (Result.isFail(paymentResult)) {
      return Result.fail(`Failed to create payment: ${paymentResult.error}`);
    }

    const payment = paymentResult.value;

    // 6. Auto-confirmar se solicitado (antes de registrar)
    if (data.autoConfirm) {
      const confirmResult = payment.confirm(data.transactionId);
      if (Result.isFail(confirmResult)) {
        return Result.fail(`Failed to confirm payment: ${confirmResult.error}`);
      }
    }

    // 7. Registrar no Aggregate
    const registerResult = payable.registerPayment(payment);
    if (Result.isFail(registerResult)) {
      return Result.fail(registerResult.error);
    }

    // 8. Persistir
    try {
      await this.payableRepository.save(payable);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save payable: ${message}`);
    }

    // 9. Retornar resultado
    return Result.ok({
      payableId: payable.id,
      paymentId: payment.id,
      payableStatus: payable.status,
      paymentStatus: payment.status,
      totalPaid: payable.totalPaid.amount,
      remainingAmount: payable.remainingAmount.amount,
      paidAt: payment.paidAt.toISOString(),
    });
  }
}

