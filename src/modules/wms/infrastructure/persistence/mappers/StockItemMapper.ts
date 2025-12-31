import { StockItem } from '../../../domain/entities/StockItem';
import { StockQuantity, UnitOfMeasure } from '../../../domain/value-objects/StockQuantity';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';
import type { WmsStockItemPersistence } from '../schemas/StockItemSchema';

/**
 * StockItemMapper - E7.8 WMS Semana 2
 * 
 * Converte StockItem entre Domain e Persistence
 * Segue INFRA-002: Money = 2 campos (amount + currency)
 * Segue INFRA-006: reconstitute() ao invés de create()
 */

export class StockItemMapper {
  static toDomain(persistence: WmsStockItemPersistence): Result<StockItem> {
    // Reconstituir quantity
    const quantityResult = StockQuantity.reconstitute(
      parseFloat(String(persistence.quantity)),
      persistence.quantityUnit as UnitOfMeasure
    );
    if (!Result.isOk(quantityResult)) {
      return Result.fail<any>(quantityResult.error);
    }

    // Reconstituir reservedQuantity
    const reservedResult = StockQuantity.reconstitute(
      parseFloat(String(persistence.reservedQuantity)),
      persistence.reservedQuantityUnit as UnitOfMeasure
    );
    if (!Result.isOk(reservedResult)) {
      return Result.fail<any>(reservedResult.error);
    }

    // Reconstituir unitCost (INFRA-002: Money com currency)
    const unitCostResult = Money.create(
      parseFloat(String(persistence.unitCostAmount)),
      persistence.unitCostCurrency
    );
    if (!Result.isOk(unitCostResult)) {
      return Result.fail<any>(unitCostResult.error);
    }

    // Usar reconstitute para preservar timestamps
    const stockItemResult = StockItem.reconstitute({
      id: persistence.id,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
      productId: persistence.productId,
      locationId: persistence.locationId,
      quantity: quantityResult.value,
      reservedQuantity: reservedResult.value,
      lotNumber: persistence.lotNumber ?? undefined,
      expirationDate: persistence.expirationDate ?? undefined,
      unitCost: unitCostResult.value,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt
    });

    if (!Result.isOk(stockItemResult)) {
      return Result.fail<any>(stockItemResult.error);
    }

    return Result.ok(stockItemResult.value);
  }

  static toPersistence(stockItem: StockItem): WmsStockItemPersistence {
    return {
      id: stockItem.id,
      organizationId: stockItem.organizationId,
      branchId: stockItem.branchId,
      productId: stockItem.productId,
      locationId: stockItem.locationId,
      quantity: String(stockItem.quantity.value),
      quantityUnit: stockItem.quantity.unit,
      reservedQuantity: String(stockItem.reservedQuantity.value),
      reservedQuantityUnit: stockItem.reservedQuantity.unit,
      lotNumber: stockItem.lotNumber ?? null,
      expirationDate: stockItem.expirationDate ?? null,
      unitCostAmount: String(stockItem.unitCost.amount),
      unitCostCurrency: stockItem.unitCost.currency,
      createdAt: stockItem.createdAt,
      updatedAt: stockItem.updatedAt,
      deletedAt: null
    };
  }
}

