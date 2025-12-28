import { z } from 'zod';

export const PayAccountPayableInputSchema = z.object({
  payableId: z.string().uuid('Invalid payable ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('BRL'),
  method: z.enum(['PIX', 'BOLETO', 'TED', 'DOC', 'CHEQUE', 'CASH', 'OTHER']),
  bankAccountId: z.string().uuid().optional(),
  transactionId: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  // Se true, confirma automaticamente
  autoConfirm: z.boolean().default(true),
});

export type PayAccountPayableInput = z.infer<typeof PayAccountPayableInputSchema>;

export interface PayAccountPayableOutput {
  payableId: string;
  paymentId: string;
  payableStatus: string;
  paymentStatus: string;
  totalPaid: number;
  remainingAmount: number;
  paidAt: string;
}

