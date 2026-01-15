/**
 * Input Port: Cancelamento de Documento Fiscal
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface CancelFiscalDocumentInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Motivo do cancelamento */
  reason: string;
  /** Número do protocolo (opcional) */
  protocolNumber?: string;
}

export interface CancelFiscalDocumentOutput {
  documentId: string;
  status: 'CANCELLED';
  cancelledAt: Date;
  protocolNumber?: string;
}

export interface ICancelFiscalDocument {
  execute(
    input: CancelFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<CancelFiscalDocumentOutput, string>>;
}
