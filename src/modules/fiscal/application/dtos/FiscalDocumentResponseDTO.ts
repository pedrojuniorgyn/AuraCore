import { FiscalDocument } from '../../domain/entities/FiscalDocument';
import { DocumentType, DocumentStatus } from '../../domain/value-objects/DocumentType';

/**
 * DTO: Fiscal Document Response
 */
export interface FiscalDocumentResponseDTO {
  id: string;
  documentType: DocumentType;
  series: string;
  number: string;
  status: DocumentStatus;
  issueDate: Date;
  issuerId: string;
  issuerName: string;
  recipientCnpjCpf?: string;
  recipientName?: string;
  totalDocument: number;
  itemsCount: number;
  fiscalKey?: string;
  protocolNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: number;
  branchId: number;
}

/**
 * DTO: Paginated Fiscal Documents
 */
export interface PaginatedFiscalDocumentsDTO {
  data: FiscalDocumentResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Mapper: FiscalDocument → FiscalDocumentResponseDTO
 */
export function toFiscalDocumentResponseDTO(document: FiscalDocument): FiscalDocumentResponseDTO {
  return {
    id: document.id,
    documentType: document.documentType,
    series: document.series,
    number: document.number,
    status: document.status,
    issueDate: document.issueDate,
    issuerId: document.issuerId,
    issuerName: document.issuerName,
    recipientCnpjCpf: document.recipientCnpjCpf,
    recipientName: document.recipientName,
    totalDocument: document.totalDocument.amount,
    itemsCount: document.items.length,
    fiscalKey: document.fiscalKey?.value,
    protocolNumber: document.protocolNumber,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    organizationId: document.organizationId,
    branchId: document.branchId,
  };
}

