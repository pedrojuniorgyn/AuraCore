import { z } from 'zod';

/**
 * TransferStock DTO - E7.8 WMS Semana 2
 */

export const TransferStockSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  fromLocationId: z.string().uuid('From Location ID must be a valid UUID'),
  toLocationId: z.string().uuid('To Location ID must be a valid UUID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(10, 'Unit too long'),
  reason: z.string().max(500, 'Reason too long').optional()
});

export type TransferStockInput = z.infer<typeof TransferStockSchema>;

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

