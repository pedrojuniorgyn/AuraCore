/**
 * Input Port: Transmissão de Documento para SEFAZ
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface TransmitToSefazInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Ambiente: PRODUCAO ou HOMOLOGACAO */
  environment: 'PRODUCTION' | 'STAGING';
  /** Forçar retransmissão */
  force?: boolean;
}

export interface TransmitToSefazOutput {
  documentId: string;
  transmissionId: string;
  status: 'SENT' | 'PROCESSING' | 'AUTHORIZED' | 'REJECTED';
  protocolNumber?: string;
  sefazResponse: {
    code: string;
    message: string;
    processedAt: Date;
  };
  transmittedAt: Date;
}

export interface ITransmitToSefaz {
  execute(
    input: TransmitToSefazInput,
    context: ExecutionContext
  ): Promise<Result<TransmitToSefazOutput, string>>;
}
