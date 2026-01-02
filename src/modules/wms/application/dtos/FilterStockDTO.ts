import { z } from 'zod';

/**
 * Stock Filter DTO - E7.8 WMS Semana 3
 * 
 * Filtros específicos para listagem de estoque
 */

export const FilterStockSchema = z.object({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  minQuantity: z.number().nonnegative().optional(),
  hasStock: z.boolean().optional(), // true = only items with quantity > 0
  lotNumber: z.string().max(50).optional(),
  expired: z.boolean().optional() // true = only expired, false = only valid
});

export type FilterStockInput = z.infer<typeof FilterStockSchema>;

