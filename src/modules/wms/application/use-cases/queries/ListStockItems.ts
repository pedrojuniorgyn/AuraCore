import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IStockRepository } from '@/modules/wms/domain/ports/IStockRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { PaginatedResponse } from '../../dtos/ListQueryDTO';
import type { FilterStockInput } from '../../dtos/FilterStockDTO';
import type { StockItem } from '@/modules/wms/domain/entities/StockItem';

export interface ListStockItemsInput extends FilterStockInput {
  page: number;
  limit: number;
}

export interface StockItemListItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  unit: string;
  availableQuantity: number;
  lotNumber: string | null;
  expirationDate: Date | null;
  isExpired: boolean;
  unitCost: number;
  currency: string;
  createdAt: Date;
}

@injectable()
export class ListStockItems {
  constructor(
    @inject('StockRepository')
    private stockRepository: IStockRepository
  ) {}

  async execute(
    input: ListStockItemsInput,
    context: ExecutionContext
  ): Promise<Result<PaginatedResponse<StockItemListItem>, string>> {
    if (input.page < 1) {
      return Result.fail('Page must be at least 1');
    }
    if (input.limit < 1 || input.limit > 100) {
      return Result.fail('Limit must be between 1 and 100');
    }

    const stockItems = await this.stockRepository.findMany(
      context.organizationId,
      context.branchId,
      {
        productId: input.productId,
        locationId: input.locationId,
        warehouseId: input.warehouseId,
        minQuantity: input.minQuantity,
        hasStock: input.hasStock,
        lotNumber: input.lotNumber,
        expired: input.expired
      },
      {
        page: input.page,
        limit: input.limit
      }
    );

    const total = await this.stockRepository.count(
      context.organizationId,
      context.branchId,
      {
        productId: input.productId,
        locationId: input.locationId,
        warehouseId: input.warehouseId,
        minQuantity: input.minQuantity,
        hasStock: input.hasStock,
        lotNumber: input.lotNumber,
        expired: input.expired
      }
    );

    const items: StockItemListItem[] = stockItems.map((item: StockItem) => ({
      id: item.id,
      productId: item.productId,
      locationId: item.locationId,
      quantity: item.quantity.value,
      unit: item.quantity.unit,
      availableQuantity: item.availableQuantity.value,
      lotNumber: item.lotNumber ?? null,
      expirationDate: item.expirationDate ?? null,
      isExpired: item.isExpired(),
      unitCost: item.unitCost.amount,
      currency: item.unitCost.currency,
      createdAt: item.createdAt
    }));

    return Result.ok<PaginatedResponse<StockItemListItem>>({
      items,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit)
    });
  }
}
