/**
 * CancelTripInput - Schema Zod para validação de cancelamento de viagem
 */
import { z } from 'zod';

export const cancelTripSchema = z.object({
  tripId: z.number().int().positive('ID da viagem deve ser positivo'),
  reason: z.string().min(1, 'Motivo do cancelamento é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

export type CancelTripInputDto = z.infer<typeof cancelTripSchema>;
