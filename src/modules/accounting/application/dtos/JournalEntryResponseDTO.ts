import { JournalEntry } from '../../domain/entities/JournalEntry';

/**
 * DTO de linha para resposta
 */
export interface JournalEntryLineDTO {
  id: string;
  accountId: string;
  accountCode: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  description?: string;
  costCenterId?: number;
  businessPartnerId?: number;
}

/**
 * DTO para resposta de lançamento contábil
 */
export interface JournalEntryResponseDTO {
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
  lines: JournalEntryLineDTO[];
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
 * Mapper: Domain → DTO
 */
export function toJournalEntryResponseDTO(entry: JournalEntry): JournalEntryResponseDTO {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    branchId: entry.branchId,
    entryNumber: entry.entryNumber,
    entryDate: entry.entryDate.toISOString(),
    period: entry.period.periodKey,
    description: entry.description,
    source: entry.source,
    sourceId: entry.sourceId,
    status: entry.status,
    lines: entry.lines.map(line => ({
      id: line.id,
      accountId: line.accountId,
      accountCode: line.accountCode,
      entryType: line.entryType,
      amount: line.amount.amount,
      currency: line.amount.currency,
      description: line.description,
      costCenterId: line.costCenterId,
      businessPartnerId: line.businessPartnerId,
    })),
    totalDebit: entry.totalDebit.amount,
    totalCredit: entry.totalCredit.amount,
    isBalanced: entry.isBalanced,
    lineCount: entry.lineCount,
    reversedById: entry.reversedById,
    reversesId: entry.reversesId,
    postedAt: entry.postedAt?.toISOString(),
    postedBy: entry.postedBy,
    notes: entry.notes,
    version: entry.version,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

/**
 * DTO para listagem paginada
 */
export interface PaginatedJournalEntriesDTO {
  data: JournalEntryResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

