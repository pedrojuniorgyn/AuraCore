/**
 * Accounting Domain Types - Journal Entry
 * 
 * Tipos puros do domain para operações de Lançamento Contábil.
 * Estes tipos são usados pelos Input Ports (domain/ports/input/).
 * 
 * @see ARCH-001: Domain não importa de Application
 * @see ARCH-003: Domain não importa bibliotecas externas (Zod)
 */

/**
 * Contexto de execução para Use Cases
 */
export interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin?: boolean;
}

/**
 * Tipos de origem do lançamento
 */
export type JournalEntrySource = 
  | 'MANUAL'
  | 'PAYMENT'
  | 'RECEIPT'
  | 'FISCAL_DOC'
  | 'DEPRECIATION'
  | 'PROVISION'
  | 'CLOSING'
  | 'ADJUSTMENT';

/**
 * Tipo de lançamento (débito ou crédito)
 */
export type EntryType = 'DEBIT' | 'CREDIT';

/**
 * Linha de lançamento contábil
 */
export interface JournalLineInput {
  accountId: string;
  accountCode: string;
  entryType: EntryType;
  amount: number;
  currency: string;
  description?: string;
  costCenterId?: number;
  businessPartnerId?: number;
}

/**
 * Input para criar lançamento contábil
 */
export interface CreateJournalEntryInput {
  entryDate: string;
  description: string;
  source: JournalEntrySource;
  sourceId?: string;
  notes?: string;
  lines: JournalLineInput[];
}

/**
 * Output após criar lançamento contábil
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

/**
 * Input para adicionar linha a lançamento existente
 */
export interface AddLineInput {
  journalEntryId: string;
  accountId: string;
  accountCode: string;
  entryType: EntryType;
  amount: number;
  currency: string;
  description?: string;
  costCenterId?: number;
  businessPartnerId?: number;
}

/**
 * Output após adicionar linha
 */
export interface AddLineOutput {
  lineId: string;
  journalEntryId: string;
  entryType: string;
  amount: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

/**
 * Response de linha de lançamento
 */
export interface JournalEntryLineResponse {
  id: string;
  accountId: string;
  accountCode: string;
  entryType: EntryType;
  amount: number;
  currency: string;
  description?: string;
  costCenterId?: number;
  businessPartnerId?: number;
}

/**
 * Response de lançamento contábil
 */
export interface JournalEntryResponse {
  id: string;
  organizationId: number;
  branchId: number;
  entryNumber: string;
  entryDate: string;
  period: string;
  description: string;
  source: string;
  sourceId?: string;
  status: string;
  lines: JournalEntryLineResponse[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lineCount: number;
  reversedById?: string;
  reversesId?: string;
  postedAt?: string;
  postedBy?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resultado paginado de lançamentos
 */
export interface PaginatedJournalEntries {
  data: JournalEntryResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Input para estornar lançamento
 */
export interface ReverseJournalEntryInput {
  journalEntryId: string;
  reversalDate?: string;
  description?: string;
}

/**
 * Output após estornar lançamento
 */
export interface ReverseJournalEntryOutput {
  originalEntryId: string;
  reversalEntryId: string;
  reversalEntryNumber: string;
  status: string;
}

/**
 * Input para postar lançamento
 */
export interface PostJournalEntryInput {
  journalEntryId: string;
}

/**
 * Output após postar lançamento
 */
export interface PostJournalEntryOutput {
  id: string;
  status: string;
  postedAt: string;
  postedBy: string;
}
