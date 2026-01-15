/**
 * Input Port: Consulta de Status na SEFAZ
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface QuerySefazStatusInput {
  /** ID do documento fiscal ou chave fiscal */
  documentIdOrFiscalKey: string;
  /** Ambiente: PRODUCAO ou HOMOLOGACAO */
  environment?: 'PRODUCTION' | 'STAGING';
}

export interface SefazStatusDetails {
  fiscalKey: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  protocolNumber?: string;
  authorizedAt?: Date;
  cancelledAt?: Date;
  lastCheckedAt: Date;
}

export interface QuerySefazStatusOutput {
  documentId: string;
  sefazStatus: SefazStatusDetails;
  queriedAt: Date;
}

export interface IQuerySefazStatus {
  execute(
    input: QuerySefazStatusInput,
    context: ExecutionContext
  ): Promise<Result<QuerySefazStatusOutput, string>>;
}
