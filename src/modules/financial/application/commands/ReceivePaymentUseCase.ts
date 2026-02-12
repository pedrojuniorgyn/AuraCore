/**
 * ReceivePaymentUseCase - Command para registrar recebimento
 * 
 * F1.6: Suporta juros, multa e desconto.
 * O valor efetivo recebido = principal + interest + fine - discount
 * Os componentes são incluídos no ReceivableReceivedEvent para que o
 * FinancialAccountingIntegration gere lançamentos contábeis separados.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { logger } from '@/shared/infrastructure/logging';
import type { IReceivePayment, ReceivePaymentInput, ReceivePaymentOutput } from '../../domain/ports/input/IReceivePayment';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';

@injectable()
export class ReceivePaymentUseCase implements IReceivePayment {
  constructor(
    @inject('IReceivableRepository') private receivableRepository: IReceivableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: ReceivePaymentInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ReceivePaymentOutput, string>> {
    // 1. Buscar receivable
    const findResult = await this.receivableRepository.findById(
      input.receivableId,
      context.organizationId,
      context.branchId
    );

    if (Result.isFail(findResult)) {
      return Result.fail(`Erro ao buscar conta a receber: ${findResult.error}`);
    }

    if (!findResult.value) {
      return Result.fail('Conta a receber não encontrada');
    }

    const receivable = findResult.value;

    // 2. F1.6: Calcular componentes
    const interest = input.interest ?? 0;
    const fine = input.fine ?? 0;
    const discount = input.discount ?? 0;
    const effectiveAmount = input.amount + interest + fine - discount;

    // 3. Registrar recebimento (principal amount é o que abate o saldo)
    const receiveResult = receivable.receivePayment(
      input.amount,
      input.bankAccountId,
      context.userId
    );

    if (Result.isFail(receiveResult)) {
      return Result.fail(receiveResult.error);
    }

    // 4. Persistir
    const saveResult = await this.receivableRepository.save(receivable);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 4.1. Persistir domain events no outbox (F1.7 + F1.6)
    // O aggregate emite ReceivableReceivedEvent básico em receivePayment().
    // Enriquecemos com breakdown (juros/multa/desconto) para contabilização.
    const events = receivable.clearDomainEvents();
    const enrichedEvents = events.map(evt => {
      if (evt.eventType === 'ReceivableReceived' && (interest > 0 || fine > 0 || discount > 0)) {
        return {
          ...evt,
          payload: {
            ...(evt.payload as Record<string, unknown>),
            interest,
            fine,
            discount,
          },
        };
      }
      return evt;
    });

    try {
      await saveToOutbox(enrichedEvents, db);
    } catch (outboxError: unknown) {
      // Fallback: publicar diretamente
      logger.warn(`Outbox save failed for receivable ${receivable.id}, falling back to direct publish`);
      for (const evt of enrichedEvents) {
        await this.eventPublisher.publish(evt);
      }
    }

    // 5. Retornar output com breakdown
    const hasBreakdown = interest > 0 || fine > 0 || discount > 0;

    return Result.ok({
      id: receivable.id,
      amountReceived: receivable.amountReceived.amount,
      remainingAmount: receivable.remainingAmount.amount,
      status: receivable.status.value,
      receiveDate: receivable.receiveDate,
      breakdown: hasBreakdown ? {
        principal: input.amount,
        interest,
        fine,
        discount,
        effectiveAmount,
      } : undefined,
    });
  }
}
