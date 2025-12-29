import { z } from 'zod';

/**
 * Schema para adicionar linha a um lançamento
 */
export const AddLineInputSchema = z.object({
  journalEntryId: z.string().uuid('Invalid journal entry ID'),
  accountId: z.string().uuid('Invalid account ID'),
  accountCode: z.string().min(1, 'Account code is required'),
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('BRL'),
  description: z.string().max(200).optional(),
  costCenterId: z.number().int().positive().optional(),
  businessPartnerId: z.number().int().positive().optional(),
});

export type AddLineInput = z.infer<typeof AddLineInputSchema>;

export interface AddLineOutput {
  lineId: string;
  journalEntryId: string;
  entryType: string;
  amount: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

