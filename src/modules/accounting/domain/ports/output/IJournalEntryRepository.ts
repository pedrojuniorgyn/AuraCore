import { JournalEntry } from '../../entities/JournalEntry';
import { AccountingPeriod } from '../../value-objects/AccountingPeriod';

/**
 * Filtros para busca de lançamentos contábeis
 * 
 * IMPORTANTE (ENFORCE-003, ENFORCE-004):
 * - branchId é OBRIGATÓRIO (nunca opcional)
 * - Todos os métodos DEVEM filtrar por organizationId + branchId
 */
export interface FindJournalEntriesFilter {
  organizationId: number;
  branchId: number; // OBRIGATÓRIO (ENFORCE-004)
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
 * 
 * REGRAS CRÍTICAS (infrastructure-layer.json):
 * - TODOS os métodos DEVEM filtrar por organizationId + branchId (INFRA-004)
 * - branchId NUNCA é opcional (ENFORCE-004)
 * - Soft delete com deletedAt (filtrar IS NULL)
 */
export interface IJournalEntryRepository {
  /**
   * Busca por ID
   * 
   * @param id ID do lançamento
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<JournalEntry | null>;

  /**
   * Busca com filtros e paginação
   * 
   * @param filter Filtros de busca (branchId obrigatório)
   * @param pagination Opções de paginação
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
   * 
   * @param organizationId ID da organização
   * @param period Período contábil
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  findByPeriod(
    organizationId: number,
    period: AccountingPeriod,
    branchId: number
  ): Promise<JournalEntry[]>;

  /**
   * Busca por documento origem
   * 
   * @param sourceId ID do documento origem
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  findBySourceId(
    sourceId: string,
    organizationId: number,
    branchId: number
  ): Promise<JournalEntry | null>;

  /**
   * Verifica existência
   * 
   * @param id ID do lançamento
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean>;

  /**
   * Gera próximo número de lançamento
   * 
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  nextEntryNumber(organizationId: number, branchId: number): Promise<string>;
}

