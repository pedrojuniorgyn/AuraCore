/**
 * Input Port: Submissão de Documento Fiscal para Processamento
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface SubmitFiscalDocumentInput {
  /** ID do documento fiscal */
  documentId: string;
}

export interface SubmitFiscalDocumentOutput {
  documentId: string;
  status: 'SUBMITTED' | 'PROCESSING';
  submittedAt: Date;
}

export interface ISubmitFiscalDocument {
  execute(
    input: SubmitFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<SubmitFiscalDocumentOutput, string>>;
}
