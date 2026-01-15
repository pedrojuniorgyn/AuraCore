/**
 * Input Port: Consulta de Documento Fiscal por ID
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface GetFiscalDocumentByIdInput {
  /** ID do documento fiscal */
  documentId: string;
}

export interface FiscalDocumentDto {
  id: string;
  documentType: string;
  series: string;
  number: string;
  status: string;
  fiscalKey?: string;
  issueDate: Date;
  totalValue: number;
  recipient: {
    document: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetFiscalDocumentById {
  execute(
    input: GetFiscalDocumentByIdInput,
    context: ExecutionContext
  ): Promise<Result<FiscalDocumentDto, string>>;
}
