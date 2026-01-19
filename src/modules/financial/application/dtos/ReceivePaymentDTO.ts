/**
 * ReceivePayment DTO - Schema Zod para validação
 */
import { z } from 'zod';

export const ReceivePaymentInputSchema = z.object({
  receivableId: z.string().uuid('ID do título deve ser um UUID válido'),
  amount: z.number().positive('Valor deve ser positivo'),
  bankAccountId: z.number().int().positive('ID da conta bancária deve ser positivo'),
  paymentDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export type ReceivePaymentInput = z.infer<typeof ReceivePaymentInputSchema>;
