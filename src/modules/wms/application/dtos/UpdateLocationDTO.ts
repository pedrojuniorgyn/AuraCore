import { z } from 'zod';

/**
 * UpdateLocation DTO - E7.8 WMS Semana 3
 */

export const UpdateLocationSchema = z.object({
  id: z.string().uuid('Location ID must be a valid UUID'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long').optional(),
  capacity: z.number().positive('Capacity must be positive').optional(),
  capacityUnit: z.string().max(10, 'Capacity unit too long').optional(),
  isActive: z.boolean().optional()
});

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

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

