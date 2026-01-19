/**
 * CreateReceivable DTO - Schema Zod para validação
 */
import { z } from 'zod';

export const CreateReceivableInputSchema = z.object({
  customerId: z.number().int().positive('ID do cliente deve ser positivo'),
  documentNumber: z.string().min(1, 'Número do documento é obrigatório').max(50),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  amount: z.number().positive('Valor deve ser positivo'),
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres').default('BRL'),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  discountUntil: z.coerce.date().optional(),
  discountAmount: z.number().positive().optional(),
  fineRate: z.number().min(0).max(100).optional().default(2),
  interestRate: z.number().min(0).max(100).optional().default(1),
  origin: z.enum(['MANUAL', 'FISCAL_NFE', 'FISCAL_CTE', 'SALE', 'IMPORT']).optional().default('MANUAL'),
  categoryId: z.number().int().positive().optional(),
  costCenterId: z.number().int().positive().optional(),
  chartAccountId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => !data.issueDate || data.dueDate >= data.issueDate,
  { message: 'Data de vencimento deve ser igual ou posterior à data de emissão', path: ['dueDate'] }
);

export type CreateReceivableInput = z.infer<typeof CreateReceivableInputSchema>;
