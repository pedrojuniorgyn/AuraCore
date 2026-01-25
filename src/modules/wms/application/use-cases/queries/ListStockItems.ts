import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IStockRepository } from '@/modules/wms/domain/ports/output/IStockRepository';
import type { IListStockItems, ListStockItemsInput, StockItemListItem } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { PaginatedResponse } from '../../dtos/ListQueryDTO';

/**
 * ListStockItems Query - E7.8 WMS Semana 2
 * 
 * @implements IListStockItems - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class ListStockItems implements IListStockItems {
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

    // ✅ S1.3-APP: Mapear items com Result unwrap
    const items: StockItemListItem[] = [];
    for (const item of stockItems) {
      const availableResult = item.getAvailableQuantity();
      if (Result.isFail(availableResult)) {
        return Result.fail(`Erro ao obter quantidade disponível: ${availableResult.error}`);
      }
      
      items.push({
        id: item.id,
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity.value,
        unit: item.quantity.unit,
        availableQuantity: availableResult.value.value,
        lotNumber: item.lotNumber ?? null,
        expirationDate: item.expirationDate ?? null,
        isExpired: item.isExpired(),
        unitCost: item.unitCost.amount,
        currency: item.unitCost.currency,
        createdAt: item.createdAt
      });
    }

    return Result.ok<PaginatedResponse<StockItemListItem>>({
      items,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit)
    });
  }
}
