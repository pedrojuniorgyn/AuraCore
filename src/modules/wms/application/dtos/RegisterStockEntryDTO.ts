import { z } from 'zod';

/**
 * RegisterStockEntry DTO - E7.8 WMS Semana 2
 */

export const RegisterStockEntrySchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  locationId: z.string().uuid('Location ID must be a valid UUID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(10, 'Unit too long'),
  unitCost: z.number().nonnegative('Unit cost cannot be negative'),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  referenceType: z.enum(['FISCAL_DOC', 'ORDER', 'ADJUSTMENT', 'INVENTORY']).optional(),
  referenceId: z.string().uuid().optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
  lotNumber: z.string().max(50, 'Lot number too long').optional(),
  expirationDate: z.string().datetime().optional()
});

export type RegisterStockEntryInput = z.infer<typeof RegisterStockEntrySchema>;

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

