import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IMovementRepository } from '@/modules/wms/domain/ports/IMovementRepository';
import type { IGetMovementById, GetMovementByIdInput, GetMovementByIdOutput } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

/**
 * GetMovementById Query - E7.8 WMS Semana 2
 * 
 * @implements IGetMovementById - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class GetMovementById implements IGetMovementById {
  constructor(
    @inject('MovementRepository')
    private movementRepository: IMovementRepository
  ) {}

  async execute(
    input: GetMovementByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetMovementByIdOutput, string>> {
    const movement = await this.movementRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!movement) {
      return Result.fail('Movement not found');
    }

    return Result.ok<GetMovementByIdOutput>({
      id: movement.id,
      productId: movement.productId,
      fromLocationId: movement.fromLocationId ?? null,
      toLocationId: movement.toLocationId ?? null,
      type: movement.type.value,
      quantity: movement.quantity.value,
      unit: movement.quantity.unit,
      unitCost: movement.unitCost.amount,
      currency: movement.unitCost.currency,
      totalCost: movement.totalCost.amount,
      reason: movement.reason ?? null,
      executedBy: movement.executedBy,
      executedAt: movement.executedAt,
      createdAt: movement.createdAt
    });
  }
}
