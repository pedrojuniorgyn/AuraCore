/**
 * ISefazClientService - Output Port
 *
 * Interface para comunicacao com webservices SEFAZ (CTe/MDFe).
 * Implementada por adapter que encapsula o legacy sefaz-client.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 */

import { Result } from '@/shared/domain';

export interface SefazTransmissionResult {
  success: boolean;
  protocolNumber?: string;
  fiscalKey?: string;
  status: string;
  message: string;
}

export interface SefazStatusResult {
  available: boolean;
  status: string;
  responseTime: number;
}

export interface ISefazClientService {
  /**
   * Envia CTe XML para autorizacao na SEFAZ
   */
  sendCteToSefaz(cteXml: string, uf: string): Promise<Result<SefazTransmissionResult, string>>;

  /**
   * Envia MDFe XML para autorizacao na SEFAZ
   */
  sendMdfeToSefaz(mdfeXml: string, uf: string): Promise<Result<SefazTransmissionResult, string>>;

  /**
   * Consulta status do servico SEFAZ para uma UF
   */
  checkStatus(uf: string): Promise<Result<SefazStatusResult, string>>;
}
