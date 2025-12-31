import { BaseDomainEvent } from '@/shared/domain';
import { StockQuantity } from '../value-objects/StockQuantity';

/**
 * WmsEvents: Domain Events para WMS
 * 
 * E7.8 WMS - Semana 1
 */

export class StockEntryRegistered extends BaseDomainEvent {
  constructor(
    movementId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      locationId: string;
      quantity: StockQuantity;
      referenceType?: string;
      referenceId?: string;
      executedBy: string;
      executedAt: Date;
    }
  ) {
    super(movementId, 'StockMovement', 'StockEntryRegistered', payload);
  }
}

export class StockExitRegistered extends BaseDomainEvent {
  constructor(
    movementId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      locationId: string;
      quantity: StockQuantity;
      referenceType?: string;
      referenceId?: string;
      executedBy: string;
      executedAt: Date;
    }
  ) {
    super(movementId, 'StockMovement', 'StockExitRegistered', payload);
  }
}

export class StockTransferred extends BaseDomainEvent {
  constructor(
    movementId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: StockQuantity;
      executedBy: string;
      executedAt: Date;
    }
  ) {
    super(movementId, 'StockMovement', 'StockTransferred', payload);
  }
}

export class StockAdjusted extends BaseDomainEvent {
  constructor(
    movementId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      locationId: string;
      quantity: StockQuantity;
      adjustmentType: 'PLUS' | 'MINUS';
      reason: string;
      executedBy: string;
      executedAt: Date;
    }
  ) {
    super(movementId, 'StockMovement', 'StockAdjusted', payload);
  }
}

export class StockReserved extends BaseDomainEvent {
  constructor(
    stockItemId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      locationId: string;
      quantity: StockQuantity;
      orderId: string;
    }
  ) {
    super(stockItemId, 'StockItem', 'StockReserved', payload);
  }
}

export class StockReleased extends BaseDomainEvent {
  constructor(
    stockItemId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      locationId: string;
      quantity: StockQuantity;
      orderId: string;
    }
  ) {
    super(stockItemId, 'StockItem', 'StockReleased', payload);
  }
}

export class InventoryCountCreated extends BaseDomainEvent {
  constructor(
    inventoryCountId: string,
    payload: {
      organizationId: number;
      branchId: number;
      locationId: string;
      productId: string;
      systemQuantity: StockQuantity;
    }
  ) {
    super(inventoryCountId, 'InventoryCount', 'InventoryCountCreated', payload);
  }
}

export class InventoryCountCompleted extends BaseDomainEvent {
  constructor(
    inventoryCountId: string,
    payload: {
      organizationId: number;
      branchId: number;
      locationId: string;
      productId: string;
      systemQuantity: StockQuantity;
      countedQuantity: StockQuantity;
      difference: StockQuantity;
      countedBy: string;
    }
  ) {
    super(inventoryCountId, 'InventoryCount', 'InventoryCountCompleted', payload);
  }
}

export class InventoryAdjustmentApplied extends BaseDomainEvent {
  constructor(
    inventoryCountId: string,
    payload: {
      organizationId: number;
      branchId: number;
      productId: string;
      locationId: string;
      adjustmentMovementId: string;
      oldQuantity: StockQuantity;
      newQuantity: StockQuantity;
      difference: StockQuantity;
    }
  ) {
    super(inventoryCountId, 'InventoryCount', 'InventoryAdjustmentApplied', payload);
  }
}

export class LowStockDetected extends BaseDomainEvent {
  constructor(
    productId: string,
    payload: {
      organizationId: number;
      branchId: number;
      currentQuantity: StockQuantity;
      minimumQuantity: StockQuantity;
      locationId?: string;
    }
  ) {
    super(productId, 'StockItem', 'LowStockDetected', payload);
  }
}
