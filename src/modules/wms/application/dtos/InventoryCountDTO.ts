import { z } from 'zod';

/**
 * InventoryCount DTOs - E7.8 WMS Semana 2
 */

// Start Inventory Count
export const StartInventoryCountSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  locationId: z.string().uuid('Location ID must be a valid UUID')
});

export type StartInventoryCountInput = z.infer<typeof StartInventoryCountSchema>;

export interface StartInventoryCountOutput {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  systemUnit: string;
  status: string;
  createdAt: Date;
}

// Complete Inventory Count
export const CompleteInventoryCountSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  locationId: z.string().uuid('Location ID must be a valid UUID'),
  countedQuantity: z.number().nonnegative('Counted quantity cannot be negative')
});

export type CompleteInventoryCountInput = z.infer<typeof CompleteInventoryCountSchema>;

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

