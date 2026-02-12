/**
 * PartialPaymentUseCase - Command DDD (F2.2)
 * 
 * Registra recebimento parcial de um título a receber.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { FINANCIAL_TOKENS } from '../../infrastructure/di/tokens';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';
import type { IPartialPayment, PartialPaymentInput, PartialPaymentOutput } from '../../domain/ports/input/IPartialPayment';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class PartialPaymentUseCase implements IPartialPayment {
  constructor(
    @inject(FINANCIAL_TOKENS.ReceivableRepository) private readonly repo: IReceivableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: PartialPaymentInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<PartialPaymentOutput, string>> {
    // 1. Buscar receivable
    const findResult = await this.repo.findById(input.receivableId, ctx.organizationId, ctx.branchId);
    if (Result.isFail(findResult)) {
      return Result.fail(findResult.error);
    }

    const receivable = findResult.value;
    if (!receivable) {
      return Result.fail('Receivable not found');
    }

    // 2. Registrar pagamento parcial
    const receiveResult = receivable.receivePayment(
      input.amount,
      input.bankAccountId,
      ctx.userId
    );

    if (Result.isFail(receiveResult)) {
      return Result.fail(receiveResult.error);
    }

    // 3. Salvar
    const saveResult = await this.repo.save(receivable);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    // 4. Publicar eventos via outbox
    const events = receivable.clearDomainEvents();
    if (events.length > 0) {
      try {
        await saveToOutbox(events, db);
      } catch (outboxError: unknown) {
        logger.warn(`Outbox save failed for partial payment, falling back to direct publish`);
        for (const evt of events) {
          await this.eventPublisher.publish(evt);
        }
      }
    }

    const totalReceived = receivable.amountReceived.amount;
    const remainingAmount = receivable.amount.amount - totalReceived;

    return Result.ok({
      receivableId: receivable.id,
      amountReceived: input.amount,
      totalReceived,
      remainingAmount: Math.max(0, remainingAmount),
      newStatus: String(receivable.status),
    });
  }
}
