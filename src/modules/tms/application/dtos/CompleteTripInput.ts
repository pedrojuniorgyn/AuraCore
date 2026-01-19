/**
 * CompleteTripInput - Schema Zod para validação de conclusão de viagem
 */
import { z } from 'zod';

export const completeTripSchema = z.object({
  tripId: z.number().int().positive('ID da viagem deve ser positivo'),
  actualRevenue: z.number().nonnegative('Receita não pode ser negativa').optional(),
  actualCost: z.number().nonnegative('Custo não pode ser negativo').optional(),
});

export type CompleteTripInputDto = z.infer<typeof completeTripSchema>;
