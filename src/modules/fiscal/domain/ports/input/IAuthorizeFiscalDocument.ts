/**
 * Input Port: Autorização de Documento Fiscal na SEFAZ
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';

export interface AuthorizeFiscalDocumentInput {
  /** ID do documento fiscal */
  id: string;
  /** Chave fiscal */
  fiscalKey: string;
  /** Número do protocolo SEFAZ */
  protocolNumber: string;
  /** Data do protocolo */
  protocolDate: Date;
}

export interface AuthorizeFiscalDocumentOutput {
  id: string;
  status: string;
  fiscalKey: string;
  protocolNumber: string;
}

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface IAuthorizeFiscalDocument {
  execute(
    input: AuthorizeFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<AuthorizeFiscalDocumentOutput, string>>;
}
