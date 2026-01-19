/**
 * ListTripsInput - Schema Zod para validação de listagem de viagens
 */
import { z } from 'zod';

export const listTripsSchema = z.object({
  status: z.enum(['DRAFT', 'ALLOCATED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']).optional(),
  driverId: z.number().int().positive().optional(),
  vehicleId: z.number().int().positive().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
});

export type ListTripsInputDto = z.infer<typeof listTripsSchema>;
