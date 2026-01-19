import { z } from 'zod';

/**
 * Schema Zod para criação de lançamento contábil
 */
export const CreateJournalEntryInputSchema = z.object({
  entryDate: z.string().datetime({ message: 'Invalid entry date format' }),
  description: z.string().min(1, 'Description is required').max(500),
  source: z.enum([
    'MANUAL',
    'PAYMENT',
    'RECEIPT', 
    'FISCAL_DOC',
    'DEPRECIATION',
    'PROVISION',
    'CLOSING',
    'ADJUSTMENT',
  ]).default('MANUAL'),
  sourceId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  // Linhas podem ser adicionadas na criação ou depois
  lines: z.array(z.object({
    accountId: z.string().uuid('Invalid account ID'),
    accountCode: z.string().min(1, 'Account code is required'),
    entryType: z.enum(['DEBIT', 'CREDIT']),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().length(3).default('BRL'),
    description: z.string().max(200).optional(),
    costCenterId: z.number().int().positive().optional(),
    businessPartnerId: z.number().int().positive().optional(),
  })).optional().default([]),
}).superRefine((data, ctx) => {
  // Validação de partidas dobradas APENAS se linhas foram fornecidas
  if (data.lines && data.lines.length > 0) {
    // Regra 1: Deve ter pelo menos 2 linhas
    if (data.lines.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lançamento contábil deve ter ao menos 2 linhas (débito e crédito)',
        path: ['lines'],
      });
      return;
    }

    // Regra 2: Deve ter pelo menos uma linha de débito E uma de crédito
    const hasDebit = data.lines.some(l => l.entryType === 'DEBIT');
    const hasCredit = data.lines.some(l => l.entryType === 'CREDIT');

    if (!hasDebit || !hasCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lançamento deve ter pelo menos uma linha de débito e uma de crédito',
        path: ['lines'],
      });
      return;
    }

    // Regra 3: Partidas dobradas - Total Débitos = Total Créditos
    const totalDebits = data.lines
      .filter(l => l.entryType === 'DEBIT')
      .reduce((sum, l) => sum + l.amount, 0);
    
    const totalCredits = data.lines
      .filter(l => l.entryType === 'CREDIT')
      .reduce((sum, l) => sum + l.amount, 0);
    
    // Tolerância de 0.01 para arredondamentos de ponto flutuante
    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Partidas dobradas: Total débitos (${totalDebits.toFixed(2)}) deve ser igual ao total créditos (${totalCredits.toFixed(2)})`,
        path: ['lines'],
      });
    }
  }
});

export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntryInputSchema>;

/**
 * DTO de saída após criação
 */
export interface CreateJournalEntryOutput {
  id: string;
  entryNumber: string;
  status: string;
  entryDate: string;
  description: string;
  lineCount: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdAt: string;
}

