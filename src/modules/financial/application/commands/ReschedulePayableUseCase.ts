/**
 * ReschedulePayableUseCase - Command DDD (F2.1)
 * 
 * Reagenda (altera vencimento) de um título em aberto.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import type { IReschedulePayable, ReschedulePayableInput, ReschedulePayableOutput } from '../../domain/ports/input/IReschedulePayable';
import { publishViaOutbox } from '@/shared/application/helpers/publishViaOutbox';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';

@injectable()
export class ReschedulePayableUseCase implements IReschedulePayable {
  constructor(
    @inject(TOKENS.PayableRepository) private readonly repo: IPayableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: ReschedulePayableInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ReschedulePayableOutput, string>> {
    const payable = await this.repo.findById(input.payableId, ctx.organizationId, ctx.branchId);
    if (!payable) {
      return Result.fail('Payable not found');
    }

    const oldDueDate = payable.terms.dueDate.toISOString();

    const reason = input.reason.trim();
    if (!reason) {
      return Result.fail('Reason is required for rescheduling');
    }

    const rescheduleResult = payable.reschedule(new Date(input.newDueDate), reason);
    if (Result.isFail(rescheduleResult)) {
      return Result.fail(rescheduleResult.error);
    }

    await this.repo.save(payable);
    await publishViaOutbox(payable, this.eventPublisher);

    return Result.ok({
      id: payable.id,
      oldDueDate,
      newDueDate: payable.terms.dueDate.toISOString(),
    });
  }
}
