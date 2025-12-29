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

