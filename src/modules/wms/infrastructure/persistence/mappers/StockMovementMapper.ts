import { StockMovement } from '../../../domain/entities/StockMovement';
import { MovementType, MovementTypeEnum } from '../../../domain/value-objects/MovementType';
import { StockQuantity, UnitOfMeasure } from '../../../domain/value-objects/StockQuantity';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';
import type { WmsStockMovementPersistence } from '../schemas/StockMovementSchema';

/**
 * StockMovementMapper - E7.8 WMS Semana 2
 * 
 * Converte StockMovement entre Domain e Persistence
 * Segue INFRA-002: Money = 2 campos (amount + currency)
 * Segue INFRA-006: reconstitute() ao invés de create()
 */

export class StockMovementMapper {
  static toDomain(persistence: WmsStockMovementPersistence): Result<StockMovement, string> {
    // Reconstituir MovementType
    const typeResult = MovementType.reconstitute(persistence.type as MovementTypeEnum);
    if (!Result.isOk(typeResult)) {
      return Result.fail(typeResult.error);
    }

    // Reconstituir quantity
    const quantityResult = StockQuantity.reconstitute(
      parseFloat(String(persistence.quantity)),
      persistence.quantityUnit as UnitOfMeasure
    );
    if (!Result.isOk(quantityResult)) {
      return Result.fail(quantityResult.error);
    }

    // Reconstituir unitCost (INFRA-002: Money com currency)
    const unitCostResult = Money.create(
      parseFloat(String(persistence.unitCostAmount)),
      persistence.unitCostCurrency
    );
    if (!Result.isOk(unitCostResult)) {
      return Result.fail(unitCostResult.error);
    }

    // Reconstituir totalCost (INFRA-002: Money com currency)
    const totalCostResult = Money.create(
      parseFloat(String(persistence.totalCostAmount)),
      persistence.totalCostCurrency
    );
    if (!Result.isOk(totalCostResult)) {
      return Result.fail(totalCostResult.error);
    }

    // Usar reconstitute para preservar timestamps
    const movementResult = StockMovement.reconstitute({
      id: persistence.id,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
      productId: persistence.productId,
      fromLocationId: persistence.fromLocationId ?? undefined,
      toLocationId: persistence.toLocationId ?? undefined,
      type: typeResult.value,
      quantity: quantityResult.value,
      unitCost: unitCostResult.value,
      referenceType: (persistence.referenceType as 'FISCAL_DOC' | 'ORDER' | 'ADJUSTMENT' | 'INVENTORY') ?? undefined,
      referenceId: persistence.referenceId ?? undefined,
      reason: persistence.reason ?? undefined,
      executedBy: persistence.executedBy,
      executedAt: persistence.executedAt,
      createdAt: persistence.createdAt
    });

    if (!Result.isOk(movementResult)) {
      return Result.fail(movementResult.error);
    }

    return Result.ok(movementResult.value);
  }

  static toPersistence(movement: StockMovement): WmsStockMovementPersistence {
    return {
      id: movement.id,
      organizationId: movement.organizationId,
      branchId: movement.branchId,
      productId: movement.productId,
      fromLocationId: movement.fromLocationId ?? null,
      toLocationId: movement.toLocationId ?? null,
      type: movement.type.value,
      quantity: String(movement.quantity.value),
      quantityUnit: movement.quantity.unit,
      unitCostAmount: String(movement.unitCost.amount),
      unitCostCurrency: movement.unitCost.currency,
      // Cache getTotalCost() result to avoid redundant computation
      ...(() => {
        const totalCost = movement.getTotalCost().value;
        return {
          totalCostAmount: String(totalCost.amount),
          totalCostCurrency: totalCost.currency,
        };
      })(),
      referenceType: movement.referenceType ?? null,
      referenceId: movement.referenceId ?? null,
      reason: movement.reason ?? null,
      executedBy: movement.executedBy,
      executedAt: movement.executedAt,
      createdAt: movement.createdAt,
      deletedAt: null
    };
  }
}

