import { JournalEntry } from '../../entities/JournalEntry';
import { AccountingPeriod } from '../../value-objects/AccountingPeriod';

/**
 * Filtros para busca de lançamentos
 */
export interface FindJournalEntriesFilter {
  organizationId: number;
  branchId?: number;
  status?: string[];
  source?: string[];
  periodYear?: number;
  periodMonth?: number;
  entryDateFrom?: Date;
  entryDateTo?: Date;
  search?: string;
}

/**
 * Opções de paginação
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Port: Repository de Lançamentos Contábeis
 */
export interface IJournalEntryRepository {
  /**
   * Busca por ID
   */
  findById(id: string, organizationId: number): Promise<JournalEntry | null>;

  /**
   * Busca com filtros e paginação
   */
  findMany(
    filter: FindJournalEntriesFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<JournalEntry>>;

  /**
   * Salva (create ou update)
   */
  save(entry: JournalEntry): Promise<void>;

  /**
   * Salva múltiplos lançamentos atomicamente (em transação)
   * Usado para operações que afetam múltiplos registros (ex: estorno)
   */
  saveMany(entries: JournalEntry[]): Promise<void>;

  /**
   * Busca por período
   */
  findByPeriod(
    organizationId: number,
    period: AccountingPeriod,
    branchId?: number
  ): Promise<JournalEntry[]>;

  /**
   * Busca por documento origem
   */
  findBySourceId(
    sourceId: string,
    organizationId: number
  ): Promise<JournalEntry | null>;

  /**
   * Verifica existência
   */
  exists(id: string, organizationId: number): Promise<boolean>;

  /**
   * Gera próximo número de lançamento
   */
  nextEntryNumber(organizationId: number, branchId: number): Promise<string>;
}

