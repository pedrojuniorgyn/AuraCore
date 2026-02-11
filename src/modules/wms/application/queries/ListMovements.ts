import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IMovementRepository } from '@/modules/wms/domain/ports/output/IMovementRepository';
import type { IListMovements, ListMovementsInput, MovementListItem } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../dtos/ExecutionContext';
import type { PaginatedResponse } from '../dtos/ListQueryDTO';
import type { StockMovement } from '@/modules/wms/domain/entities/StockMovement';

/**
 * ListMovements Query - E7.8 WMS Semana 2
 * 
 * @implements IListMovements - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class ListMovements implements IListMovements {
  constructor(
    @inject('MovementRepository')
    private movementRepository: IMovementRepository
  ) {}

  async execute(
    input: ListMovementsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<MovementListItem>, string>> {
    if (input.page < 1) {
      return Result.fail('Page must be at least 1');
    }
    if (input.limit < 1 || input.limit > 100) {
      return Result.fail('Limit must be between 1 and 100');
    }

    if (input.type && !['ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT'].includes(input.type)) {
      return Result.fail('Invalid movement type');
    }

    if (input.startDate && input.endDate && input.startDate > input.endDate) {
      return Result.fail('Start date must be before end date');
    }

    const movements = await this.movementRepository.findMany(
      context.organizationId,
      context.branchId,
      {
        productId: input.productId,
        locationId: input.locationId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate
      },
      {
        page: input.page,
        limit: input.limit
      }
    );

    const total = await this.movementRepository.count(
      context.organizationId,
      context.branchId,
      {
        productId: input.productId,
        locationId: input.locationId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate
      }
    );

    const items: MovementListItem[] = movements.map((movement: StockMovement) => ({
      id: movement.id,
      productId: movement.productId,
      fromLocationId: movement.fromLocationId ?? null,
      toLocationId: movement.toLocationId ?? null,
      type: movement.type.value,
      quantity: movement.quantity.value,
      unit: movement.quantity.unit,
      unitCost: movement.unitCost.amount,
      currency: movement.unitCost.currency,
      totalCost: movement.getTotalCost().value.amount,
      reason: movement.reason ?? null,
      executedBy: movement.executedBy,
      executedAt: movement.executedAt,
      createdAt: movement.createdAt
    }));

    return Result.ok<PaginatedResponse<MovementListItem>>({
      items,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit)
    });
  }
}
