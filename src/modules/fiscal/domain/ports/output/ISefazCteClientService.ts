/**
 * ISefazCteClientService - Output Port
 *
 * Interface para operacoes CTe na SEFAZ (enviar, consultar, cancelar, inutilizar).
 * Isola os Use Cases do servico legacy de comunicacao SOAP com a SEFAZ.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 * @since E10.3
 */
import { Result } from '@/shared/domain';

export interface CteAuthorizationResult {
  success: boolean;
  protocolNumber?: string;
  fiscalKey?: string;
  status: string;
  message: string;
}

export interface CteStatusResult {
  status: string;
  protocolNumber?: string;
  message: string;
}

export interface CteInutilizationResult {
  success: boolean;
  protocolNumber?: string;
  message: string;
}

export interface ISefazCteClientService {
  /**
   * Envia CTe assinado para autorizacao na SEFAZ
   */
  enviarCte(xmlAssinado: string): Promise<Result<CteAuthorizationResult, string>>;

  /**
   * Consulta status de um CTe pela chave de acesso
   */
  consultarCte(chaveAcesso: string): Promise<Result<CteStatusResult, string>>;

  /**
   * Cancela um CTe autorizado
   */
  cancelarCte(
    chaveAcesso: string,
    protocolo: string,
    justificativa: string,
  ): Promise<Result<CteAuthorizationResult, string>>;

  /**
   * Inutiliza faixa de numeracao de CTe
   */
  inutilizarCte(
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    ano: number,
    justificativa: string,
  ): Promise<Result<CteInutilizationResult, string>>;
}
