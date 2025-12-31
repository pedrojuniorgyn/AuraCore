import { z } from 'zod';

/**
 * CreateLocation DTO - E7.8 WMS Semana 2
 */

export const CreateLocationSchema = z.object({
  warehouseId: z.string().uuid('Warehouse ID must be a valid UUID'),
  code: z.string().min(1, 'Code is required').max(20, 'Code too long'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  type: z.enum(['WAREHOUSE', 'AISLE', 'SHELF', 'POSITION']),
  parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
  capacity: z.number().positive('Capacity must be positive').optional(),
  capacityUnit: z.string().max(10, 'Capacity unit too long').optional(),
  isActive: z.boolean().optional()
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;

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

