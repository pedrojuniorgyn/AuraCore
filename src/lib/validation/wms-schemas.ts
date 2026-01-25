import { z } from 'zod';

/**
 * WMS Module - Zod Validation Schemas
 * 
 * Schemas de validação para módulo WMS (Warehouse Management System)
 * 
 * @see Sprint Blindagem S1.1 Batch 3
 */

// ============================================================
// ENUMS E TIPOS BASE
// ============================================================

/**
 * Tipo de localização
 */
export const locationTypeSchema = z.enum([
  'RECEIVING',    // Recebimento
  'STORAGE',      // Armazenagem
  'PICKING',      // Separação
  'STAGING',      // Expedição
  'SHIPPING',     // Embarque
  'QUARANTINE',   // Quarentena
  'DAMAGED'       // Avariados
], {
  errorMap: () => ({ message: 'Tipo de localização inválido' })
});

/**
 * Status da localização
 */
export const locationStatusSchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'BLOCKED',
  'MAINTENANCE'
], {
  errorMap: () => ({ message: 'Status da localização inválido' })
});

/**
 * Tipo de movimento
 */
export const movementTypeSchema = z.enum([
  'ENTRY',        // Entrada
  'EXIT',         // Saída
  'TRANSFER',     // Transferência
  'ADJUSTMENT',   // Ajuste
  'RETURN',       // Devolução
  'INVENTORY'     // Inventário
], {
  errorMap: () => ({ message: 'Tipo de movimento inválido' })
});

/**
 * Status do item de estoque
 */
export const stockItemStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'IN_TRANSIT',
  'DAMAGED',
  'EXPIRED',
  'BLOCKED'
], {
  errorMap: () => ({ message: 'Status do item inválido' })
});

/**
 * Unidade de medida
 */
export const unitSchema = z.enum([
  'UN',  // Unidade
  'KG',  // Quilograma
  'L',   // Litro
  'M',   // Metro
  'M2',  // Metro quadrado
  'M3',  // Metro cúbico
  'CX',  // Caixa
  'PC',  // Peça
  'PAR', // Par
  'DUZIA', // Dúzia
], {
  errorMap: () => ({ message: 'Unidade de medida inválida' })
});

// ============================================================
// VALIDAÇÕES CUSTOMIZADAS
// ============================================================

/**
 * Validação de código de barras EAN-13
 */
export const ean13Schema = z
  .string()
  .regex(/^\d{13}$/, 'Código EAN-13 deve ter 13 dígitos');

/**
 * Validação de lote
 */
export const lotNumberSchema = z
  .string()
  .min(1)
  .max(50)
  .optional();

/**
 * Validação de número de série
 */
export const serialNumberSchema = z
  .string()
  .min(1)
  .max(50)
  .optional();

// ============================================================
// SCHEMAS DE CRIAÇÃO (POST)
// ============================================================

/**
 * Schema para criar localização
 */
export const createLocationSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  warehouseId: z.string().uuid('ID do armazém inválido'),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  description: z.string().max(200).optional(),
  type: locationTypeSchema,
  zone: z.string().max(10).optional(), // A, B, C...
  aisle: z.string().max(10).optional(), // 01, 02...
  rack: z.string().max(10).optional(), // 01, 02...
  level: z.string().max(10).optional(), // 1, 2, 3...
  position: z.string().max(10).optional(), // A, B, C...
  maxWeight: z.number().positive().optional(), // kg
  maxVolume: z.number().positive().optional(), // m³
  maxItems: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Schema para criar item de estoque
 */
export const createStockItemSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  productId: z.string().uuid('ID do produto inválido'),
  locationId: z.string().uuid('ID da localização inválido'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unit: z.string().min(1).max(10), // UN, KG, L, M, etc
  lotNumber: lotNumberSchema,
  serialNumber: serialNumberSchema,
  expiryDate: z.string().datetime().optional(),
  manufacturingDate: z.string().datetime().optional(),
  unitCost: z.number().nonnegative().optional(),
  status: stockItemStatusSchema.default('AVAILABLE'),
});

/**
 * Schema para movimento de estoque
 */
export const createMovementSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  productId: z.string().uuid('ID do produto inválido'),
  type: movementTypeSchema,
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unit: z.string().min(1).max(10),
  fromLocationId: z.string().uuid().optional().nullable(),
  toLocationId: z.string().uuid().optional().nullable(),
  lotNumber: lotNumberSchema,
  serialNumber: serialNumberSchema,
  reason: z.string().max(500).optional(),
  referenceType: z.string().max(50).optional(), // NFE, CTE, TRIP, etc
  referenceId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    // ENTRY deve ter toLocationId
    if (data.type === 'ENTRY' && !data.toLocationId) {
      return false;
    }
    // EXIT deve ter fromLocationId
    if (data.type === 'EXIT' && !data.fromLocationId) {
      return false;
    }
    // TRANSFER deve ter ambos
    if (data.type === 'TRANSFER' && (!data.fromLocationId || !data.toLocationId)) {
      return false;
    }
    return true;
  },
  { 
    message: 'ENTRY requer toLocationId, EXIT requer fromLocationId, TRANSFER requer ambos',
    path: ['type'] 
  }
);

/**
 * Schema para criar inventário
 */
export const createInventorySchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  warehouseId: z.string().uuid('ID do armazém inválido'),
  name: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).optional(),
  type: z.enum(['FULL', 'PARTIAL', 'CYCLE_COUNT']),
  scheduledStartAt: z.string().datetime({ message: 'Data de início inválida (ISO 8601)' }),
  scheduledEndAt: z.string().datetime({ message: 'Data de término inválida (ISO 8601)' }),
  responsibleId: z.string().uuid('ID do responsável inválido'),
}).refine(
  (data) => new Date(data.scheduledStartAt) < new Date(data.scheduledEndAt),
  { message: 'Data de início deve ser anterior à data de término', path: ['scheduledStartAt'] }
);

/**
 * Schema para contagem de inventário
 */
export const createInventoryCountSchema = z.object({
  inventoryId: z.string().uuid('ID do inventário inválido'),
  locationId: z.string().uuid('ID da localização inválido'),
  productId: z.string().uuid('ID do produto inválido'),
  expectedQuantity: z.number().nonnegative(),
  countedQuantity: z.number().nonnegative(),
  unit: z.string().min(1).max(10),
  lotNumber: lotNumberSchema,
  serialNumber: serialNumberSchema,
  notes: z.string().max(500).optional(),
});

// ============================================================
// SCHEMAS DE ATUALIZAÇÃO (PUT/PATCH)
// ============================================================

/**
 * Schema para atualizar localização
 */
export const updateLocationSchema = createLocationSchema.partial().omit({ organizationId: true, branchId: true });

/**
 * Schema para atualizar item de estoque
 */
export const updateStockItemSchema = createStockItemSchema.partial().omit({ organizationId: true, branchId: true });

// ============================================================
// SCHEMAS DE QUERY (GET com filtros)
// ============================================================

/**
 * Schema para query de estoque
 */
export const queryStockSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  status: stockItemStatusSchema.optional(),
  lotNumber: z.string().optional(),
  expiringBefore: z.string().datetime().optional(), // Itens próximos do vencimento
});

/**
 * Schema para query de movimentos
 */
export const queryMovementsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: movementTypeSchema.optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

/**
 * Schema para query de localizações
 */
export const queryLocationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  warehouseId: z.string().uuid().optional(),
  type: locationTypeSchema.optional(),
  status: locationStatusSchema.optional(),
  zone: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
});

/**
 * Schema para query de inventários
 */
export const queryInventoriesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  warehouseId: z.string().uuid().optional(),
  type: z.enum(['FULL', 'PARTIAL', 'CYCLE_COUNT']).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

// ============================================================
// TYPES EXPORTADOS
// ============================================================

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type CreateInventoryCountInput = z.infer<typeof createInventoryCountSchema>;

export type QueryStockInput = z.infer<typeof queryStockSchema>;
export type QueryMovementsInput = z.infer<typeof queryMovementsSchema>;
export type QueryLocationsInput = z.infer<typeof queryLocationsSchema>;
export type QueryInventoriesInput = z.infer<typeof queryInventoriesSchema>;
