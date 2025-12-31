/**
 * WmsErrors: Domain Errors para WMS
 * 
 * E7.8 WMS - Semana 1
 * 
 * Errors:
 * - INVALID_LOCATION_CODE: Código de localização inválido
 * - INVALID_QUANTITY: Quantidade inválida
 * - INSUFFICIENT_STOCK: Estoque insuficiente
 * - LOCATION_NOT_FOUND: Localização não encontrada
 * - PRODUCT_NOT_IN_LOCATION: Produto não encontrado na localização
 * - INVALID_MOVEMENT_TYPE: Tipo de movimentação inválido
 * - INVENTORY_ALREADY_COUNTED: Inventário já contado
 * - CAPACITY_EXCEEDED: Capacidade excedida
 * - EXPIRED_PRODUCT: Produto vencido
 */

export const WmsErrors = {
  // LocationCode errors
  INVALID_LOCATION_CODE: 'INVALID_LOCATION_CODE',
  LOCATION_CODE_TOO_LONG: 'LOCATION_CODE_TOO_LONG',
  LOCATION_CODE_EMPTY: 'LOCATION_CODE_EMPTY',

  // Quantity errors
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  NEGATIVE_QUANTITY: 'NEGATIVE_QUANTITY',
  INVALID_UNIT_OF_MEASURE: 'INVALID_UNIT_OF_MEASURE',
  DIFFERENT_UNITS: 'DIFFERENT_UNITS',

  // Stock errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INSUFFICIENT_AVAILABLE_STOCK: 'INSUFFICIENT_AVAILABLE_STOCK',
  INSUFFICIENT_RESERVED_STOCK: 'INSUFFICIENT_RESERVED_STOCK',
  STOCK_ITEM_NOT_FOUND: 'STOCK_ITEM_NOT_FOUND',
  PRODUCT_NOT_IN_LOCATION: 'PRODUCT_NOT_IN_LOCATION',
  EXPIRED_PRODUCT: 'EXPIRED_PRODUCT',
  NEAR_EXPIRATION: 'NEAR_EXPIRATION',

  // Location errors
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  LOCATION_ALREADY_EXISTS: 'LOCATION_ALREADY_EXISTS',
  LOCATION_CODE_DUPLICATE: 'LOCATION_CODE_DUPLICATE',
  LOCATION_HAS_CHILDREN: 'LOCATION_HAS_CHILDREN',
  LOCATION_INACTIVE: 'LOCATION_INACTIVE',
  LOCATION_INVALID_TYPE: 'LOCATION_INVALID_TYPE',
  LOCATION_PARENT_NOT_FOUND: 'LOCATION_PARENT_NOT_FOUND',

  // Warehouse errors
  WAREHOUSE_NOT_FOUND: 'WAREHOUSE_NOT_FOUND',
  WAREHOUSE_INACTIVE: 'WAREHOUSE_INACTIVE',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  WAREHOUSE_CODE_DUPLICATE: 'WAREHOUSE_CODE_DUPLICATE',

  // Movement errors
  INVALID_MOVEMENT_TYPE: 'INVALID_MOVEMENT_TYPE',
  MOVEMENT_REQUIRES_FROM_LOCATION: 'MOVEMENT_REQUIRES_FROM_LOCATION',
  MOVEMENT_REQUIRES_TO_LOCATION: 'MOVEMENT_REQUIRES_TO_LOCATION',
  MOVEMENT_SAME_LOCATION: 'MOVEMENT_SAME_LOCATION',
  MOVEMENT_NOT_FOUND: 'MOVEMENT_NOT_FOUND',

  // Inventory errors
  INVENTORY_NOT_FOUND: 'INVENTORY_NOT_FOUND',
  INVENTORY_ALREADY_COUNTED: 'INVENTORY_ALREADY_COUNTED',
  INVENTORY_NOT_COUNTABLE: 'INVENTORY_NOT_COUNTABLE',
  INVENTORY_CANNOT_BE_MODIFIED: 'INVENTORY_CANNOT_BE_MODIFIED',
  INVENTORY_INVALID_STATUS: 'INVENTORY_INVALID_STATUS',
  INVENTORY_NO_DIVERGENCE: 'INVENTORY_NO_DIVERGENCE',
  INVENTORY_HAS_DIVERGENCE: 'INVENTORY_HAS_DIVERGENCE',

  // General errors
  INVALID_REFERENCE_TYPE: 'INVALID_REFERENCE_TYPE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATE: 'INVALID_DATE',
} as const;

export type WmsErrorCode = typeof WmsErrors[keyof typeof WmsErrors];

/**
 * Helper para criar mensagens de erro consistentes
 */
export const WmsErrorMessages: Record<WmsErrorCode, string> = {
  // LocationCode
  INVALID_LOCATION_CODE: 'Location code format is invalid',
  LOCATION_CODE_TOO_LONG: 'Location code exceeds maximum length',
  LOCATION_CODE_EMPTY: 'Location code cannot be empty',

  // Quantity
  INVALID_QUANTITY: 'Quantity is invalid',
  NEGATIVE_QUANTITY: 'Quantity cannot be negative',
  INVALID_UNIT_OF_MEASURE: 'Unit of measure is invalid',
  DIFFERENT_UNITS: 'Quantities must have the same unit of measure',

  // Stock
  INSUFFICIENT_STOCK: 'Insufficient stock quantity',
  INSUFFICIENT_AVAILABLE_STOCK: 'Insufficient available stock quantity',
  INSUFFICIENT_RESERVED_STOCK: 'Insufficient reserved stock quantity',
  STOCK_ITEM_NOT_FOUND: 'Stock item not found',
  PRODUCT_NOT_IN_LOCATION: 'Product not found in location',
  EXPIRED_PRODUCT: 'Product has expired',
  NEAR_EXPIRATION: 'Product is near expiration',

  // Location
  LOCATION_NOT_FOUND: 'Location not found',
  LOCATION_ALREADY_EXISTS: 'Location already exists',
  LOCATION_CODE_DUPLICATE: 'Location code already exists',
  LOCATION_HAS_CHILDREN: 'Location has child locations',
  LOCATION_INACTIVE: 'Location is inactive',
  LOCATION_INVALID_TYPE: 'Location type is invalid',
  LOCATION_PARENT_NOT_FOUND: 'Parent location not found',

  // Warehouse
  WAREHOUSE_NOT_FOUND: 'Warehouse not found',
  WAREHOUSE_INACTIVE: 'Warehouse is inactive',
  CAPACITY_EXCEEDED: 'Warehouse capacity exceeded',
  WAREHOUSE_CODE_DUPLICATE: 'Warehouse code already exists',

  // Movement
  INVALID_MOVEMENT_TYPE: 'Movement type is invalid',
  MOVEMENT_REQUIRES_FROM_LOCATION: 'Movement requires from location',
  MOVEMENT_REQUIRES_TO_LOCATION: 'Movement requires to location',
  MOVEMENT_SAME_LOCATION: 'From and to locations must be different',
  MOVEMENT_NOT_FOUND: 'Stock movement not found',

  // Inventory
  INVENTORY_NOT_FOUND: 'Inventory count not found',
  INVENTORY_ALREADY_COUNTED: 'Inventory has already been counted',
  INVENTORY_NOT_COUNTABLE: 'Inventory cannot be counted in current status',
  INVENTORY_CANNOT_BE_MODIFIED: 'Inventory cannot be modified',
  INVENTORY_INVALID_STATUS: 'Inventory status is invalid',
  INVENTORY_NO_DIVERGENCE: 'Inventory has no divergence',
  INVENTORY_HAS_DIVERGENCE: 'Inventory has divergence that must be resolved',

  // General
  INVALID_REFERENCE_TYPE: 'Reference type is invalid',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_DATE: 'Date is invalid',
};

/**
 * Helper para obter mensagem de erro
 */
export function getWmsErrorMessage(code: WmsErrorCode): string {
  return WmsErrorMessages[code] || 'Unknown WMS error';
}

