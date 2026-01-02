import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IInventoryCountRepository } from '@/modules/wms/domain/ports/IInventoryCountRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { PaginatedResponse } from '../../dtos/ListQueryDTO';
import type { InventoryCount } from '@/modules/wms/domain/entities/InventoryCount';

export interface ListInventoryCountsInput {
  page: number;
  limit: number;
  status?: string;
  locationId?: string;
  productId?: string;
}

export interface InventoryCountListItem {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  systemUnit: string;
  countedQuantity: number | null;
  difference: number | null;
  status: string;
  countedBy: string | null;
  countedAt: Date | null;
  createdAt: Date;
}

@injectable()
export class ListInventoryCounts {
  constructor(
    @inject('InventoryCountRepository')
    private inventoryCountRepository: IInventoryCountRepository
  ) {}

  async execute(
    input: ListInventoryCountsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<InventoryCountListItem>, string>> {
    if (input.page < 1) {
      return Result.fail('Page must be at least 1');
    }
    if (input.limit < 1 || input.limit > 100) {
      return Result.fail('Limit must be between 1 and 100');
    }

    let counts;
    if (input.status) {
      counts = await this.inventoryCountRepository.findByStatus(
        input.status,
        context.organizationId,
        context.branchId
      );
    } else if (input.locationId) {
      counts = await this.inventoryCountRepository.findPendingByLocation(
        input.locationId,
        context.organizationId,
        context.branchId
      );
    } else {
      counts = await this.inventoryCountRepository.findByStatus(
        'PENDING',
        context.organizationId,
        context.branchId
      );
    }

    if (input.productId) {
      counts = counts.filter(c => c.productId === input.productId);
    }

    const total = counts.length;
    const start = (input.page - 1) * input.limit;
    const end = start + input.limit;
    const paginatedCounts = counts.slice(start, end);

    const items: InventoryCountListItem[] = paginatedCounts.map((count: InventoryCount) => ({
      id: count.id,
      productId: count.productId,
      locationId: count.locationId,
      systemQuantity: count.systemQuantity.value,
      systemUnit: count.systemQuantity.unit,
      countedQuantity: count.countedQuantity?.value ?? null,
      difference: count.difference?.value ?? null,
      status: count.status.value,
      countedBy: count.countedBy ?? null,
      countedAt: count.countedAt ?? null,
      createdAt: count.createdAt
    }));

    return Result.ok<PaginatedResponse<InventoryCountListItem>>({
      items,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit)
    });
  }
}
