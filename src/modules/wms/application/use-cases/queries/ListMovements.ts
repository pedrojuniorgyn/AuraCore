import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IMovementRepository } from '@/modules/wms/domain/ports/IMovementRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { PaginatedResponse } from '../../dtos/ListQueryDTO';
import type { StockMovement } from '@/modules/wms/domain/entities/StockMovement';

export interface ListMovementsInput {
  page: number;
  limit: number;
  productId?: string;
  locationId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MovementListItem {
  id: string;
  productId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  type: string;
  quantity: number;
  unit: string;
  unitCost: number;
  currency: string;
  totalCost: number;
  reason: string | null;
  executedBy: string;
  executedAt: Date;
  createdAt: Date;
}

@injectable()
export class ListMovements {
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
      totalCost: movement.totalCost.amount,
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
