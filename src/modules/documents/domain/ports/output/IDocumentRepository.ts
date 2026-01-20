/**
 * IDocumentRepository - Port de Output para persistência de Documents
 */
import { Result } from '@/shared/domain';
import type { Document } from '../../entities/Document';
import type { DocumentStatusType } from '../../value-objects/DocumentStatus';

export interface DocumentFilter {
  organizationId: number;
  branchId: number;
  status?: DocumentStatusType;
  docType?: string;
  entityTable?: string;
  entityId?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  pageSize?: number;
}

export interface DocumentListResult {
  items: Document[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IDocumentRepository {
  /**
   * Busca documento por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number,
  ): Promise<Result<Document | null, string>>;

  /**
   * Busca documentos por filtro
   */
  findMany(filter: DocumentFilter): Promise<Result<DocumentListResult, string>>;

  /**
   * Busca documentos por entidade associada
   */
  findByEntity(
    entityTable: string,
    entityId: number,
    organizationId: number,
    branchId: number,
  ): Promise<Result<Document[], string>>;

  /**
   * Salva documento (insert ou update)
   */
  save(document: Document): Promise<Result<void, string>>;

  /**
   * Deleta documento (soft delete)
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number,
  ): Promise<Result<void, string>>;
}
