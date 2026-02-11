/**
 * Input Port: Manifestação de NFe (Evento de Manifestação do Destinatário)
 *
 * Define contrato para manifestação de documentos NFe recebidos.
 * A Manifestação do Destinatário é obrigatória para confirmação de recebimento
 * de NFe, conforme NT 2012/002 da SEFAZ.
 *
 * Tipos de manifestação:
 * - CIENCIA: Ciência da operação (automático ou manual)
 * - CONFIRMACAO: Confirmação da operação
 * - DESCONHECIMENTO: Desconhecimento da operação (requer justificativa)
 * - NAO_REALIZADA: Operação não realizada (requer justificativa)
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see NT 2012/002: Manifestação do Destinatário NFe
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface ManifestNfeInput {
  /** Chave de acesso da NFe (44 dígitos) */
  fiscalKey: string;
  /** Tipo de manifestação */
  manifestType: 'CIENCIA' | 'CONFIRMACAO' | 'DESCONHECIMENTO' | 'NAO_REALIZADA';
  /** Justificativa (obrigatório para DESCONHECIMENTO e NAO_REALIZADA) */
  reason?: string;
}

export interface ManifestNfeOutput {
  /** ID do documento fiscal */
  documentId: string;
  /** Chave de acesso da NFe */
  fiscalKey: string;
  /** Tipo de manifestação aplicada */
  manifestType: string;
  /** Status resultante do documento */
  status: string;
  /** Data/hora do processamento */
  processedAt: Date;
}

export interface IManifestNfeUseCase {
  execute(input: ManifestNfeInput, context: ExecutionContext): Promise<Result<ManifestNfeOutput, string>>;
}
