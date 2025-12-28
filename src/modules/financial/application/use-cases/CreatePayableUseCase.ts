import { injectable, inject } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { AccountPayable } from '../../domain/entities/AccountPayable';
import { PaymentTerms } from '../../domain/value-objects/PaymentTerms';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { 
  CreatePayableInput, 
  CreatePayableInputSchema, 
  CreatePayableOutput 
} from '../dtos/CreatePayableDTO';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Criar Conta a Pagar
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Criar Value Objects (Money, PaymentTerms)
 * - Criar Aggregate (AccountPayable)
 * - Persistir via Repository
 * - Retornar DTO
 */
@injectable()
export class CreatePayableUseCase implements IUseCaseWithContext<CreatePayableInput, CreatePayableOutput> {
  private readonly payableRepository: IPayableRepository;

  constructor(@inject(TOKENS.PayableRepository) payableRepository: IPayableRepository) {
    this.payableRepository = payableRepository;
  }

  async execute(
    input: CreatePayableInput, 
    ctx: ExecutionContext
  ): Promise<Result<CreatePayableOutput, string>> {
    
    // 1. Validar input com Zod
    const validation = CreatePayableInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Criar Money
    const amountResult = Money.create(data.amount, data.currency);
    if (Result.isFail(amountResult)) {
      return Result.fail(`Invalid amount: ${amountResult.error}`);
    }

    // 3. Criar Money para desconto (se houver)
    let discountAmount: Money | undefined;
    if (data.discountAmount) {
      const discountResult = Money.create(data.discountAmount, data.currency);
      if (Result.isFail(discountResult)) {
        return Result.fail(`Invalid discount amount: ${discountResult.error}`);
      }
      discountAmount = discountResult.value;
    }

    // 4. Criar PaymentTerms
    const termsResult = PaymentTerms.create({
      dueDate: new Date(data.dueDate),
      amount: amountResult.value,
      discountUntil: data.discountUntil ? new Date(data.discountUntil) : undefined,
      discountAmount,
      fineRate: data.fineRate,
      interestRate: data.interestRate,
    });

    if (Result.isFail(termsResult)) {
      return Result.fail(`Invalid payment terms: ${termsResult.error}`);
    }

    // 5. Gerar ID único
    const id = crypto.randomUUID();

    // 6. Criar AccountPayable (Aggregate)
    const payableResult = AccountPayable.create({
      id,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      supplierId: data.supplierId,
      documentNumber: data.documentNumber,
      description: data.description,
      terms: termsResult.value,
      categoryId: data.categoryId,
      costCenterId: data.costCenterId,
      notes: data.notes,
    });

    if (Result.isFail(payableResult)) {
      return Result.fail(`Failed to create payable: ${payableResult.error}`);
    }

    const payable = payableResult.value;

    // 7. Persistir
    try {
      await this.payableRepository.save(payable);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save payable: ${message}`);
    }

    // 8. Retornar DTO
    return Result.ok({
      id: payable.id,
      documentNumber: payable.documentNumber,
      status: payable.status,
      amount: payable.originalAmount.amount,
      currency: payable.originalAmount.currency,
      dueDate: payable.terms.dueDate.toISOString(),
      createdAt: payable.createdAt.toISOString(),
    });
  }
}

