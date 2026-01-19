/**
 * CreateTripInput - Schema Zod para validação de criação de viagem
 */
import { z } from 'zod';

export const createTripSchema = z.object({
  vehicleId: z.number().int().positive('ID do veículo deve ser positivo'),
  driverId: z.number().int().positive('ID do motorista deve ser positivo'),
  driverType: z.enum(['OWN', 'THIRD_PARTY', 'AGGREGATE']).optional().default('OWN'),
  trailer1Id: z.number().int().positive().optional().nullable(),
  trailer2Id: z.number().int().positive().optional().nullable(),
  pickupOrderIds: z.array(z.number().int().positive()).optional().default([]),
  scheduledStart: z.coerce.date().optional().nullable(),
  scheduledEnd: z.coerce.date().optional().nullable(),
  estimatedRevenue: z.number().nonnegative('Receita estimada não pode ser negativa').optional(),
  estimatedCost: z.number().nonnegative('Custo estimado não pode ser negativo').optional(),
  notes: z.string().max(1000, 'Notas devem ter no máximo 1000 caracteres').optional(),
});

export type CreateTripInputDto = z.infer<typeof createTripSchema>;
