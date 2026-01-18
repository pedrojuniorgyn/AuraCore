/**
 * Input Ports - WMS Module
 *
 * Exporta interfaces Input Port para o módulo WMS.
 * Estas interfaces definem os contratos de entrada para os Use Cases.
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

// ============================================
// COMMANDS - Location Management
// ============================================
export type { ICreateLocation } from './ICreateLocation';
export type { IUpdateLocation } from './IUpdateLocation';
export type {
  IDeleteLocation,
  DeleteLocationInput,
  DeleteLocationOutput,
} from './IDeleteLocation';

// ============================================
// COMMANDS - Stock Operations
// ============================================
export type { IRegisterStockEntry } from './IRegisterStockEntry';
export type { IRegisterStockExit } from './IRegisterStockExit';
export type { ITransferStock } from './ITransferStock';

// ============================================
// COMMANDS - Inventory Count
// ============================================
export type { IStartInventoryCount } from './IStartInventoryCount';
export type { ICompleteInventoryCount } from './ICompleteInventoryCount';

// ============================================
// QUERIES - Location
// ============================================
export type {
  IGetLocationById,
  GetLocationByIdInput,
  GetLocationByIdOutput,
} from './IGetLocationById';
export type {
  IListLocations,
  ListLocationsInput,
  LocationListItem,
} from './IListLocations';

// ============================================
// QUERIES - Stock
// ============================================
export type {
  IGetStockByProduct,
  GetStockByProductInput,
  GetStockByProductOutput,
  StockByLocationItem,
} from './IGetStockByProduct';
export type {
  IGetStockItemById,
  GetStockItemByIdInput,
  GetStockItemByIdOutput,
} from './IGetStockItemById';
export type {
  IListStockItems,
  ListStockItemsInput,
  StockItemListItem,
} from './IListStockItems';

// ============================================
// QUERIES - Movement
// ============================================
export type {
  IGetMovementById,
  GetMovementByIdInput,
  GetMovementByIdOutput,
} from './IGetMovementById';
export type {
  IListMovements,
  ListMovementsInput,
  MovementListItem,
} from './IListMovements';

// ============================================
// QUERIES - Inventory Count
// ============================================
export type {
  IGetInventoryCountById,
  GetInventoryCountByIdInput,
  GetInventoryCountByIdOutput,
} from './IGetInventoryCountById';
export type {
  IListInventoryCounts,
  ListInventoryCountsInput,
  InventoryCountListItem,
} from './IListInventoryCounts';
