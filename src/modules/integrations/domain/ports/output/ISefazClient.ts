/**
 * ISefazClient - Interface para cliente SEFAZ de baixo nível
 *
 * E7-Onda A: Abstração do serviço legado sefaz-client.ts
 *
 * Esta interface abstrai a comunicação de baixo nível com webservices SEFAZ,
 * permitindo que a implementação real ou mock seja injetada via DI.
 *
 * A diferença entre ISefazClient e ISefazGateway:
 * - ISefazClient: operações de baixo nível (enviar XML, verificar status)
 * - ISefazGateway: operações de negócio (autorizar CTe, cancelar, etc.)
 *
 * O SefazGatewayAdapter usa ISefazClient internamente.
 */

/**
 * Configuração de ambiente SEFAZ
 */
export interface SefazClientConfig {
  environment: 'production' | 'homologation';
  uf: string;
  certificate?: {
    pfx: Buffer;
    password: string;
  };
}

/**
 * Resposta de autorização de CTe
 */
export interface CteAuthorizationResponse {
  success: boolean;
  protocolNumber?: string;
  authorizationDate?: Date;
  cteKey?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
}

/**
 * Resposta de autorização de MDFe
 */
export interface MdfeAuthorizationResponse {
  success: boolean;
  protocolNumber?: string;
  authorizationDate?: Date;
  mdfeKey?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
}

/**
 * Resposta de status do serviço SEFAZ
 */
export interface SefazStatusResponse {
  online: boolean;
  message: string;
  responseTime?: number;
}

/**
 * Port: Cliente SEFAZ de baixo nível
 *
 * REGRAS CRÍTICAS:
 * - Esta interface é implementada por SefazLegacyClientAdapter (produção) e MockSefazClient (testes)
 * - Todas as operações devem ser idempotentes quando possível
 * - Timeout padrão: 30 segundos
 */
export interface ISefazClient {
  /**
   * Envia CTe para autorização na SEFAZ
   *
   * @param cteXml XML do CTe a ser autorizado
   * @param config Configuração de ambiente
   * @returns Resposta com protocolo de autorização ou rejeição
   */
  sendCteForAuthorization(
    cteXml: string,
    config: SefazClientConfig
  ): Promise<CteAuthorizationResponse>;

  /**
   * Envia MDFe para autorização na SEFAZ
   *
   * @param mdfeXml XML do MDFe a ser autorizado
   * @param config Configuração de ambiente
   * @returns Resposta com protocolo de autorização ou rejeição
   */
  sendMdfeForAuthorization(
    mdfeXml: string,
    config: SefazClientConfig
  ): Promise<MdfeAuthorizationResponse>;

  /**
   * Consulta status do serviço SEFAZ
   *
   * @param config Configuração de ambiente
   * @returns Status online/offline do webservice
   */
  checkServiceStatus(config: SefazClientConfig): Promise<SefazStatusResponse>;

  /**
   * Obtém configuração padrão do certificado digital
   *
   * @returns Configuração do certificado A1
   */
  getDefaultCertificateConfig(): {
    pfxPath: string;
    password: string;
    organization: string;
  };
}
