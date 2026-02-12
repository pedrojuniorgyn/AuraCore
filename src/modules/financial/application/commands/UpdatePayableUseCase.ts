/**
 * UpdatePayableUseCase - Command DDD (F2.1)
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import type { IUpdatePayable, UpdatePayableInput, UpdatePayableOutput } from '../../domain/ports/input/IUpdatePayable';
import { publishViaOutbox } from '@/shared/application/helpers/publishViaOutbox';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';

@injectable()
export class UpdatePayableUseCase implements IUpdatePayable {
  constructor(
    @inject(TOKENS.PayableRepository) private readonly repo: IPayableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: UpdatePayableInput,
    ctx: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<UpdatePayableOutput, string>> {
    const payable = await this.repo.findById(input.payableId, ctx.organizationId, ctx.branchId);
    if (!payable) {
      return Result.fail('Payable not found');
    }

    const updatedFields: string[] = [];

    const changes: Record<string, unknown> = {};
    if (input.description !== undefined) { changes.description = input.description; updatedFields.push('description'); }
    if (input.notes !== undefined) { changes.notes = input.notes; updatedFields.push('notes'); }
    if (input.categoryId !== undefined) { changes.categoryId = input.categoryId; updatedFields.push('categoryId'); }
    if (input.costCenterId !== undefined) { changes.costCenterId = input.costCenterId; updatedFields.push('costCenterId'); }
    if (input.supplierId !== undefined) { changes.supplierId = input.supplierId; updatedFields.push('supplierId'); }

    if (updatedFields.length === 0) {
      return Result.fail('No fields to update');
    }

    const updateResult = payable.update(changes as Parameters<typeof payable.update>[0]);
    if (Result.isFail(updateResult)) {
      return Result.fail(updateResult.error);
    }

    await this.repo.save(payable);
    await publishViaOutbox(payable, this.eventPublisher);

    return Result.ok({ id: payable.id, updatedFields });
  }
}
