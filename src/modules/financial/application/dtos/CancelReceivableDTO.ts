/**
 * CancelReceivable DTO - Schema Zod para validação
 */
import { z } from 'zod';

export const CancelReceivableInputSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500),
});

export type CancelReceivableInput = z.infer<typeof CancelReceivableInputSchema>;
