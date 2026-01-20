/**
 * SefazLegacyClientAdapter - Adapter para serviço legado sefaz-client.ts
 *
 * E7-Onda A: Wrapper DDD para código legado
 *
 * Este adapter implementa a interface ISefazClient e delega para o serviço
 * legado em src/services/fiscal/sefaz-client.ts.
 *
 * IMPORTANTE: Este é um adapter de transição. Quando a migração DDD estiver
 * completa, o código do sefaz-client.ts será movido para cá diretamente.
 *
 * @see ISefazClient
 */

import { injectable } from '@/shared/infrastructure/di/container';
import type {
  ISefazClient,
  SefazClientConfig,
  CteAuthorizationResponse,
  MdfeAuthorizationResponse,
  SefazStatusResponse,
} from '../../../domain/ports/output/ISefazClient';

// Imports do serviço legado
// TODO: Após migração completa, mover código para cá
import {
  sendCteToSefaz,
  sendMdfeToSefaz,
  checkSefazStatus,
  getDefaultSefazConfig,
} from '@/services/fiscal/sefaz-client';
import { getDefaultCertificateConfig as getLegacyCertificateConfig } from '@/services/fiscal/certificate-manager';

/**
 * Adapter para serviço SEFAZ legado
 *
 * Implementa ISefazClient delegando para funções em src/services/fiscal/
 */
@injectable()
export class SefazLegacyClientAdapter implements ISefazClient {
  /**
   * Envia CTe para autorização na SEFAZ
   */
  async sendCteForAuthorization(
    cteXml: string,
    config: SefazClientConfig
  ): Promise<CteAuthorizationResponse> {
    const legacyConfig = {
      environment: config.environment,
      uf: config.uf,
      certificate: config.certificate,
    };

    const response = await sendCteToSefaz(cteXml, legacyConfig);

    return {
      success: response.success,
      protocolNumber: response.protocolNumber,
      authorizationDate: response.authorizationDate,
      cteKey: response.cteKey,
      rejectionCode: response.rejectionCode,
      rejectionMessage: response.rejectionMessage,
    };
  }

  /**
   * Envia MDFe para autorização na SEFAZ
   */
  async sendMdfeForAuthorization(
    mdfeXml: string,
    config: SefazClientConfig
  ): Promise<MdfeAuthorizationResponse> {
    const legacyConfig = {
      environment: config.environment,
      uf: config.uf,
      certificate: config.certificate,
    };

    const response = await sendMdfeToSefaz(mdfeXml, legacyConfig);

    return {
      success: response.success,
      protocolNumber: response.protocolNumber,
      authorizationDate: response.authorizationDate,
      mdfeKey: response.mdfeKey,
      rejectionCode: response.rejectionCode,
      rejectionMessage: response.rejectionMessage,
    };
  }

  /**
   * Consulta status do serviço SEFAZ
   */
  async checkServiceStatus(
    config: SefazClientConfig
  ): Promise<SefazStatusResponse> {
    const legacyConfig = {
      environment: config.environment,
      uf: config.uf,
    };

    const response = await checkSefazStatus(legacyConfig);

    return {
      online: response.online,
      message: response.message,
      responseTime: response.responseTime,
    };
  }

  /**
   * Obtém configuração padrão do certificado digital
   */
  getDefaultCertificateConfig(): {
    pfxPath: string;
    password: string;
    organization: string;
  } {
    return getLegacyCertificateConfig();
  }
}
