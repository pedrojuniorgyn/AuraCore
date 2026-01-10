import { InventoryCount } from '../../../domain/entities/InventoryCount';
import { InventoryStatus, InventoryStatusEnum } from '../../../domain/value-objects/InventoryStatus';
import { StockQuantity, UnitOfMeasure } from '../../../domain/value-objects/StockQuantity';
import { Result } from '@/shared/domain';
import type { WmsInventoryCountPersistence } from '../schemas/InventoryCountSchema';

/**
 * InventoryCountMapper - E7.8 WMS Semana 2
 * 
 * Converte InventoryCount entre Domain e Persistence
 * Segue INFRA-006: reconstitute() ao invés de create()
 */

export class InventoryCountMapper {
  static toDomain(persistence: WmsInventoryCountPersistence): Result<InventoryCount, string> {
    // Reconstituir systemQuantity
    const systemQtyResult = StockQuantity.reconstitute(
      parseFloat(String(persistence.systemQuantity)),
      persistence.systemQuantityUnit as UnitOfMeasure
    );
    if (!Result.isOk(systemQtyResult)) {
      return Result.fail(systemQtyResult.error);
    }

    // Reconstituir countedQuantity se existir
    let countedQuantity: StockQuantity | undefined;
    if (persistence.countedQuantity !== null && persistence.countedQuantityUnit !== null) {
      const countedResult = StockQuantity.reconstitute(
        parseFloat(String(persistence.countedQuantity)),
        persistence.countedQuantityUnit as UnitOfMeasure
      );
      if (!Result.isOk(countedResult)) {
        return Result.fail(countedResult.error);
      }
      countedQuantity = countedResult.value;
    }

    // Reconstituir status
    const statusResult = InventoryStatus.reconstitute(persistence.status as InventoryStatusEnum);
    if (!Result.isOk(statusResult)) {
      return Result.fail(statusResult.error);
    }

    // Usar reconstitute para preservar timestamps
    const inventoryCountResult = InventoryCount.reconstitute({
      id: persistence.id,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
      locationId: persistence.locationId,
      productId: persistence.productId,
      systemQuantity: systemQtyResult.value,
      countedQuantity,
      status: statusResult.value,
      countedBy: persistence.countedBy ?? undefined,
      countedAt: persistence.countedAt ?? undefined,
      adjustmentMovementId: persistence.adjustmentMovementId ?? undefined,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt
    });

    if (!Result.isOk(inventoryCountResult)) {
      return Result.fail(inventoryCountResult.error);
    }

    return Result.ok(inventoryCountResult.value);
  }

  static toPersistence(inventoryCount: InventoryCount): WmsInventoryCountPersistence {
    return {
      id: inventoryCount.id,
      organizationId: inventoryCount.organizationId,
      branchId: inventoryCount.branchId,
      locationId: inventoryCount.locationId,
      productId: inventoryCount.productId,
      systemQuantity: String(inventoryCount.systemQuantity.value),
      systemQuantityUnit: inventoryCount.systemQuantity.unit,
      countedQuantity: inventoryCount.countedQuantity ? String(inventoryCount.countedQuantity.value) : null,
      countedQuantityUnit: inventoryCount.countedQuantity?.unit ?? null,
      status: inventoryCount.status.value,
      countedBy: inventoryCount.countedBy ?? null,
      countedAt: inventoryCount.countedAt ?? null,
      adjustmentMovementId: inventoryCount.adjustmentMovementId ?? null,
      createdAt: inventoryCount.createdAt,
      updatedAt: inventoryCount.updatedAt,
      deletedAt: null
    };
  }
}

