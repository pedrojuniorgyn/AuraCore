/**
 * WMS Module - Public Exports
 * 
 * E7.8 WMS - Semana 1 (Domain Layer)
 */

// Value Objects
export * from './domain/value-objects/LocationCode';
export * from './domain/value-objects/StockQuantity';
export * from './domain/value-objects/MovementType';
export * from './domain/value-objects/InventoryStatus';

// Entities
export * from './domain/entities/Location';
export * from './domain/entities/StockItem';
export * from './domain/entities/StockMovement';
export * from './domain/entities/InventoryCount';

// Aggregates
export * from './domain/aggregates/Warehouse';

// Events
export * from './domain/events/WmsEvents';

// Errors
export * from './domain/errors/WmsErrors';

// Ports
export * from './domain/ports/ILocationRepository';
export * from './domain/ports/IStockRepository';
export * from './domain/ports/IMovementRepository';

// Services
export * from './domain/services/StockCalculator';
export * from './domain/services/InventoryValidator';

