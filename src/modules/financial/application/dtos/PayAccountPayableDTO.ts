import { z } from 'zod';

/**
 * PayAccountPayable DTO
 * 
 * F1.6: Adicionados campos opcionais interest, fine, discount, bankFee
 * para baixas com componentes adicionais.
 * 
 * Valor efetivo = principal + interest + fine - discount + bankFee
 */
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
  // F1.6: Componentes adicionais de baixa
  interest: z.number().min(0).default(0),   // Juros pagos
  fine: z.number().min(0).default(0),        // Multa paga
  discount: z.number().min(0).default(0),    // Desconto obtido
  bankFee: z.number().min(0).default(0),     // Tarifa bancária
});

// z.input = tipo da entrada (antes de defaults); z.infer = tipo da saída (após defaults)
export type PayAccountPayableInput = z.input<typeof PayAccountPayableInputSchema>;

export interface PayAccountPayableOutput {
  payableId: string;
  paymentId: string;
  payableStatus: string;
  paymentStatus: string;
  totalPaid: number;
  remainingAmount: number;
  paidAt: string;
  // F1.6: Breakdown dos componentes
  breakdown: {
    principal: number;
    interest: number;
    fine: number;
    discount: number;
    bankFee: number;
    effectiveAmount: number;
  };
}

