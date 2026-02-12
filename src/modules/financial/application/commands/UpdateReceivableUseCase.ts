/**
 * UpdateReceivableUseCase - Command DDD (F2.2)
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { FINANCIAL_TOKENS } from '../../infrastructure/di/tokens';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';
import type { IUpdateReceivable, UpdateReceivableInput, UpdateReceivableOutput } from '../../domain/ports/input/IUpdateReceivable';
import { publishViaOutbox } from '@/shared/application/helpers/publishViaOutbox';

@injectable()
export class UpdateReceivableUseCase implements IUpdateReceivable {
  constructor(
    @inject(FINANCIAL_TOKENS.ReceivableRepository) private readonly repo: IReceivableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: UpdateReceivableInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<UpdateReceivableOutput, string>> {
    const findResult = await this.repo.findById(input.receivableId, ctx.organizationId, ctx.branchId);
    if (Result.isFail(findResult)) {
      return Result.fail(findResult.error);
    }

    const receivable = findResult.value;
    if (!receivable) {
      return Result.fail('Receivable not found');
    }

    const updatedFields: string[] = [];
    const changes: Record<string, unknown> = {};

    if (input.description !== undefined) { changes.description = input.description; updatedFields.push('description'); }
    if (input.dueDate !== undefined) { changes.dueDate = new Date(input.dueDate); updatedFields.push('dueDate'); }
    if (input.categoryId !== undefined) { changes.categoryId = input.categoryId; updatedFields.push('categoryId'); }
    if (input.costCenterId !== undefined) { changes.costCenterId = input.costCenterId; updatedFields.push('costCenterId'); }
    if (input.chartAccountId !== undefined) { changes.chartAccountId = input.chartAccountId; updatedFields.push('chartAccountId'); }
    if (input.notes !== undefined) { changes.notes = input.notes; updatedFields.push('notes'); }

    if (updatedFields.length === 0) {
      return Result.fail('No fields to update');
    }

    const updateResult = receivable.update(changes as Parameters<typeof receivable.update>[0], ctx.userId);
    if (Result.isFail(updateResult)) {
      return Result.fail(updateResult.error);
    }

    const saveResult = await this.repo.save(receivable);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    await publishViaOutbox(receivable, this.eventPublisher);

    return Result.ok({ id: receivable.id, updatedFields });
  }
}
