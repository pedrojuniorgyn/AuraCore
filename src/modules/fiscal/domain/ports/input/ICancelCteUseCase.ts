/**
 * Input Port: Cancelamento de CTe
 *
 * Define contrato para cancelamento de Conhecimento de Transporte Eletrônico.
 * O cancelamento é permitido apenas para CTe em estados AUTHORIZED ou DRAFT,
 * conforme regras da SEFAZ.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see DocumentType: CTe (Modelo 57)
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface CancelCteInput {
  /** ID do CTe a ser cancelado */
  cteId: string;
  /** Justificativa do cancelamento (mín. 15 caracteres, exigência SEFAZ) */
  reason: string;
  /** Número do protocolo SEFAZ (opcional, preenchido automaticamente se via SEFAZ) */
  protocolNumber?: string;
}

export interface CancelCteOutput {
  /** ID do CTe cancelado */
  id: string;
  /** Status após cancelamento */
  status: 'CANCELLED';
  /** Data/hora do cancelamento */
  cancelledAt: Date;
  /** Número do protocolo SEFAZ */
  protocolNumber?: string;
}

export interface ICancelCteUseCase {
  execute(input: CancelCteInput, context: ExecutionContext): Promise<Result<CancelCteOutput, string>>;
}
