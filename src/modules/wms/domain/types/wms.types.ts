/**
 * WMS Domain Types
 * 
 * Tipos puros do domain para operações de Armazém (WMS).
 * Estes tipos são usados pelos Input Ports (domain/ports/input/).
 * 
 * @see ARCH-001: Domain não importa de Application
 * @see ARCH-003: Domain não importa bibliotecas externas (Zod)
 */

// ============================================
// COMMON TYPES
// ============================================

/**
 * Contexto de execução para Use Cases
 */
export interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin: boolean;
}

/**
 * Tipo de localização
 */
export type LocationType = 'WAREHOUSE' | 'AISLE' | 'SHELF' | 'POSITION';

/**
 * Tipo de referência para movimentação
 */
export type ReferenceType = 'FISCAL_DOC' | 'ORDER' | 'ADJUSTMENT' | 'INVENTORY';

// ============================================
// LOCATION TYPES
// ============================================

/**
 * Input para criar localização
 */
export interface CreateLocationInput {
  warehouseId: string;
  code: string;
  name: string;
  type: LocationType;
  parentId?: string;
  capacity?: number;
  capacityUnit?: string;
  isActive?: boolean;
}

/**
 * Output após criar localização
 */
export interface CreateLocationOutput {
  id: string;
  code: string;
  name: string;
  type: string;
  warehouseId: string;
  parentId?: string;
  capacity?: number;
  capacityUnit?: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Input para atualizar localização
 */
export interface UpdateLocationInput {
  id: string;
  name?: string;
  capacity?: number;
  capacityUnit?: string;
  isActive?: boolean;
}

/**
 * Output após atualizar localização
 */
export interface UpdateLocationOutput {
  id: string;
  code: string;
  name: string;
  type: string;
  capacity: number | null;
  capacityUnit: string | null;
  isActive: boolean;
  updatedAt: Date;
}

// ============================================
// STOCK MOVEMENT TYPES
// ============================================

/**
 * Input para registrar entrada de estoque
 */
export interface RegisterStockEntryInput {
  productId: string;
  locationId: string;
  quantity: number;
  unit: string;
  unitCost: number;
  currency?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  reason?: string;
  lotNumber?: string;
  expirationDate?: string;
}

/**
 * Output após registrar entrada de estoque
 */
export interface RegisterStockEntryOutput {
  movementId: string;
  stockItemId: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  currency: string;
  executedAt: Date;
}

/**
 * Input para registrar saída de estoque
 */
export interface RegisterStockExitInput {
  productId: string;
  locationId: string;
  quantity: number;
  unit: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  reason?: string;
}

/**
 * Output após registrar saída de estoque
 */
export interface RegisterStockExitOutput {
  movementId: string;
  stockItemId: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  currency: string;
  remainingQuantity: number;
  executedAt: Date;
}

/**
 * Input para transferir estoque
 */
export interface TransferStockInput {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unit: string;
  reason?: string;
}

/**
 * Output após transferir estoque
 */
export interface TransferStockOutput {
  movementId: string;
  fromStockItemId: string;
  toStockItemId: string;
  quantity: number;
  unit: string;
  fromRemainingQuantity: number;
  toNewQuantity: number;
  executedAt: Date;
}

// ============================================
// INVENTORY COUNT TYPES
// ============================================

/**
 * Input para iniciar contagem de inventário
 */
export interface StartInventoryCountInput {
  productId: string;
  locationId: string;
}

/**
 * Output após iniciar contagem
 */
export interface StartInventoryCountOutput {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  systemUnit: string;
  status: string;
  createdAt: Date;
}

/**
 * Input para completar contagem de inventário
 */
export interface CompleteInventoryCountInput {
  productId: string;
  locationId: string;
  countedQuantity: number;
}

/**
 * Output após completar contagem
 */
export interface CompleteInventoryCountOutput {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  status: string;
  adjustmentMovementId?: string;
  countedBy?: string;
  countedAt?: Date;
}

// ============================================
// LIST/PAGINATION TYPES
// ============================================

/**
 * Input para consultas paginadas
 */
export interface ListQueryInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response paginada genérica
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
