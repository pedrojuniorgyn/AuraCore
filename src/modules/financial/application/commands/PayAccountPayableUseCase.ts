import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Payment } from '../../domain/entities/Payment';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import { PayableNotFoundError } from '../../domain/errors/FinancialErrors';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { logger } from '@/shared/infrastructure/logging';
import { 
  PayAccountPayableInput, 
  PayAccountPayableInputSchema, 
  PayAccountPayableOutput 
} from '../dtos/PayAccountPayableDTO';
import type { IPayAccountPayable, ExecutionContext } from '../../domain/ports/input';

/**
 * Use Case: Pagar Conta a Pagar
 * 
 * F1.6: Suporta juros, multa, desconto e tarifa bancária.
 * O valor efetivo saído do banco = principal + interest + fine - discount + bankFee
 * Os componentes são incluídos no PaymentCompletedEvent para que o
 * FinancialAccountingIntegration gere lançamentos contábeis separados.
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */
@injectable()
export class PayAccountPayableUseCase implements IPayAccountPayable {
  private readonly payableRepository: IPayableRepository;

  constructor(
    @inject(TOKENS.PayableRepository) payableRepository: IPayableRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
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

    // 2. Buscar payable (branchId obrigatório - ENFORCE-004)
    const payable = await this.payableRepository.findById(
      data.payableId,
      ctx.organizationId,
      ctx.branchId
    );
    
    if (!payable) {
      return Result.fail(new PayableNotFoundError(data.payableId).message);
    }

    // 3. F1.6: Calcular valor efetivo (principal + juros + multa - desconto + tarifa)
    const interest = data.interest ?? 0;
    const fine = data.fine ?? 0;
    const discount = data.discount ?? 0;
    const bankFee = data.bankFee ?? 0;
    const effectiveAmount = data.amount + interest + fine - discount + bankFee;

    // 4. Criar Money para o valor do principal (amount que abate o saldo)
    const amountResult = Money.create(data.amount, data.currency);
    if (Result.isFail(amountResult)) {
      return Result.fail(`Invalid amount: ${amountResult.error}`);
    }

    // 5. Criar Payment (com valor principal — o que reduz o saldo devedor)
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

    // 6. Auto-confirmar se solicitado
    if (data.autoConfirm) {
      const confirmResult = payment.confirm(data.transactionId);
      if (Result.isFail(confirmResult)) {
        return Result.fail(`Failed to confirm payment: ${confirmResult.error}`);
      }
    }

    // 7. Registrar no Aggregate (o aggregate controla status via valor principal)
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

    // 8.1. Persistir domain events no outbox (F1.7 + F1.6)
    // O aggregate emite PaymentCompletedEvent básico em _recalculateStatus().
    // Precisamos enriquecer com breakdown (juros/multa/desconto) e contexto (org/branch).
    const events = payable.clearDomainEvents();
    const enrichedEvents = events.map(evt => {
      if (evt.eventType === 'PaymentCompleted') {
        return {
          ...evt,
          payload: {
            ...(evt.payload as Record<string, unknown>),
            organizationId: ctx.organizationId,
            branchId: ctx.branchId,
            supplierId: payable.supplierId,
            amount: data.amount,
            currency: data.currency,
            interest,
            fine,
            discount,
            bankFee,
          },
        };
      }
      return evt;
    });

    try {
      await saveToOutbox(enrichedEvents, db);
    } catch (outboxError: unknown) {
      // Fallback: publicar diretamente
      logger.warn(`Outbox save failed for payable ${payable.id}, falling back to direct publish`);
      for (const evt of enrichedEvents) {
        await this.eventPublisher.publish(evt);
      }
    }

    // 9. Obter valores calculados
    const totalPaidResult = payable.getTotalPaid();
    if (Result.isFail(totalPaidResult)) {
      return Result.fail(`Erro ao obter total pago: ${totalPaidResult.error}`);
    }
    
    const remainingResult = payable.getRemainingAmount();
    if (Result.isFail(remainingResult)) {
      return Result.fail(`Erro ao obter saldo restante: ${remainingResult.error}`);
    }
    
    // 10. Retornar resultado com breakdown
    return Result.ok({
      payableId: payable.id,
      paymentId: payment.id,
      payableStatus: payable.status,
      paymentStatus: payment.status,
      totalPaid: totalPaidResult.value.amount,
      remainingAmount: remainingResult.value.amount,
      paidAt: payment.paidAt.toISOString(),
      breakdown: {
        principal: data.amount,
        interest,
        fine,
        discount,
        bankFee,
        effectiveAmount,
      },
    });
  }
}
