import { z } from 'zod';

/**
 * RegisterStockExit DTO - E7.8 WMS Semana 2
 */

export const RegisterStockExitSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  locationId: z.string().uuid('Location ID must be a valid UUID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(10, 'Unit too long'),
  referenceType: z.enum(['FISCAL_DOC', 'ORDER', 'ADJUSTMENT', 'INVENTORY']).optional(),
  referenceId: z.string().uuid().optional(),
  reason: z.string().max(500, 'Reason too long').optional()
});

export type RegisterStockExitInput = z.infer<typeof RegisterStockExitSchema>;

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

