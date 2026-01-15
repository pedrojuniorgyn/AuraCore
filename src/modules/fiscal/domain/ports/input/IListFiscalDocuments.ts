/**
 * Input Port: Listagem de Documentos Fiscais
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';
import { FiscalDocumentDto } from './IGetFiscalDocumentById';

export interface ListFiscalDocumentsInput {
  /** Número da página */
  page?: number;
  /** Tamanho da página */
  pageSize?: number;
  /** Tipos de documento */
  documentType?: string[];
  /** Status */
  status?: string[];
  /** Data de emissão (de) */
  issueDateFrom?: Date;
  /** Data de emissão (até) */
  issueDateTo?: Date;
  /** Documento do destinatário */
  recipientDocument?: string;
  /** Busca textual */
  search?: string;
  /** Ordenação */
  sortBy?: string;
  /** Ordem */
  sortOrder?: 'asc' | 'desc';
}

export interface ListFiscalDocumentsOutput {
  items: FiscalDocumentDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IListFiscalDocuments {
  execute(
    input: ListFiscalDocumentsInput,
    context: ExecutionContext
  ): Promise<Result<ListFiscalDocumentsOutput, string>>;
}
