import { z } from 'zod';

/**
 * Schema Zod para validação de entrada
 */
export const CreatePayableInputSchema = z.object({
  supplierId: z.number().int().positive('Supplier ID must be positive'),
  documentNumber: z.string().min(1, 'Document number is required').max(50),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('BRL'),
  dueDate: z.string().datetime({ message: 'Invalid due date format' }),
  categoryId: z.number().int().positive().optional(),
  costCenterId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  // Condições opcionais
  discountUntil: z.string().datetime().optional(),
  discountAmount: z.number().positive().optional(),
  fineRate: z.number().min(0).max(100).optional(),
  interestRate: z.number().min(0).max(100).optional(),
});

export type CreatePayableInput = z.infer<typeof CreatePayableInputSchema>;

/**
 * DTO de saída após criação
 */
export interface CreatePayableOutput {
  id: string;
  documentNumber: string;
  status: string;
  amount: number;
  currency: string;
  dueDate: string;
  createdAt: string;
}

