/**
 * IDocumentJobRepository - Port de Output para persistência de DocumentJobs
 */
import { Result } from '@/shared/domain';
import type { DocumentJob } from '../../entities/DocumentJob';
import type { JobStatusType } from '../../value-objects/JobStatus';
import type { JobTypeValue } from '../../value-objects/JobType';

export interface DocumentJobFilter {
  organizationId: number;
  branchId?: number;
  status?: JobStatusType;
  jobType?: JobTypeValue;
  documentId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  pageSize?: number;
}

export interface DocumentJobListResult {
  items: DocumentJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClaimJobResult {
  job: DocumentJob | null;
}

export interface IDocumentJobRepository {
  /**
   * Busca job por ID
   */
  findById(
    id: string,
    organizationId: number,
  ): Promise<Result<DocumentJob | null, string>>;

  /**
   * Busca jobs por filtro
   */
  findMany(filter: DocumentJobFilter): Promise<Result<DocumentJobListResult, string>>;

  /**
   * Busca jobs por documento
   */
  findByDocumentId(
    documentId: string,
    organizationId: number,
  ): Promise<Result<DocumentJob[], string>>;

  /**
   * Claim próximo job da fila (com lock)
   * Usa transação com READPAST para evitar race condition
   */
  claimNextJob(lockTimeoutMs?: number): Promise<Result<ClaimJobResult, string>>;

  /**
   * Salva job (insert ou update)
   */
  save(job: DocumentJob): Promise<Result<void, string>>;

  /**
   * Conta jobs por status
   */
  countByStatus(
    organizationId: number,
    status: JobStatusType,
  ): Promise<Result<number, string>>;
}
