import { FiscalDocument } from '../../entities/FiscalDocument';
import { DocumentType, DocumentStatus } from '../../value-objects/DocumentType';

export interface FindFiscalDocumentsFilter {
  organizationId: number;
  branchId: number; // BUG 1 FIX: Obrigatório para multi-tenancy (.cursorrules)
  documentType?: DocumentType[];
  status?: DocumentStatus[];
  issueDateFrom?: Date;
  issueDateTo?: Date;
  recipientCnpjCpf?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IFiscalDocumentRepository {
  // BUG 2 FIX: Adicionar branchId obrigatório para multi-tenancy completo
  findById(id: string, organizationId: number, branchId: number): Promise<FiscalDocument | null>;
  findByFiscalKey(fiscalKey: string, organizationId: number, branchId: number): Promise<FiscalDocument | null>;
  findMany(filter: FindFiscalDocumentsFilter, pagination: PaginationOptions): Promise<PaginatedResult<FiscalDocument>>;
  save(document: FiscalDocument): Promise<void>;
  saveMany(documents: FiscalDocument[]): Promise<void>;
  exists(id: string, organizationId: number, branchId: number): Promise<boolean>;
  nextDocumentNumber(organizationId: number, branchId: number, documentType: DocumentType, series: string): Promise<string>;
}

