/**
 * ISefazGateway - Port para comunicação com SEFAZ
 * 
 * E7.9 Integrações - Semana 1
 * 
 * Abstrai toda comunicação com webservices SEFAZ:
 * - CTe (autorização, cancelamento, consulta)
 * - NFe (distribuição DFe, manifestação)
 * - MDFe (emissão, encerramento)
 * 
 * Princípios Hexagonais:
 * - Domain NÃO conhece infraestrutura externa
 * - Implementations: SefazGatewayAdapter (real), MockSefazGateway (teste)
 */

import { Result } from '@/shared/domain';

// CTe
export interface AuthorizeCteRequest {
  cteXml: string;
  environment: 'production' | 'homologation';
  uf: string;
}

export interface AuthorizeCteResponse {
  success: boolean;
  protocolNumber?: string;
  authorizationDate?: Date;
  cteKey?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
}

export interface CancelCteRequest {
  cteKey: string;
  protocolNumber: string;
  justification: string;
  environment: 'production' | 'homologation';
}

export interface CancelCteResponse {
  protocolNumber?: string;
  cancellationDate?: Date;
  status: string;
  message?: string;
}

// E8 Fase 2.2: Tipos adicionais
export interface QueryCteStatusRequest {
  cteKey: string;
  environment: 'production' | 'homologation';
}

export interface QueryCteStatusResponse {
  status: 'AUTHORIZED' | 'CANCELLED' | 'DENIED' | 'NOT_FOUND' | 'UNKNOWN';
  protocolNumber?: string;
  authorizationDate?: Date;
  message?: string;
}

export interface InutilizeCteRequest {
  year: number;
  series: number;
  startNumber: number;
  endNumber: number;
  justification: string;
  cnpj: string;
  environment: 'production' | 'homologation';
  uf: string;
}

export interface InutilizeCteResponse {
  protocolNumber?: string;
  inutilizationDate?: Date;
  status: string;
  message?: string;
}

// NFe
export interface QueryNfeRequest {
  cnpj: string;
  lastNsu: number;
  environment: 'production' | 'homologation';
}

export interface NfeDistribuicaoResponse {
  nfeKey: string;
  xml: string;
  schema: string;
  nsu: number;
}

export interface ManifestNfeRequest {
  nfeKey: string;
  eventType: 'CIENCIA' | 'CONFIRMACAO' | 'DESCONHECIMENTO' | 'NAO_REALIZADA';
  justification?: string;
  environment: 'production' | 'homologation';
}

// MDFe
export interface AuthorizeMdfeResponse {
  success: boolean;
  protocolNumber?: string;
  mdfeKey?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
}

/**
 * ISefazGateway - Port para comunicação com SEFAZ
 * 
 * IMPORTANTE: Todas as operações retornam Result<T> ou Result<T, string>
 * NUNCA Result<T, Error> (regra MCP ENFORCE-012)
 * 
 * E8 Fase 2.2: Tipos de retorno expandidos para CTe
 */
export interface ISefazGateway {
  // ═══════════════════════════════════════════════════════════
  // CTe
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Autoriza CTe na SEFAZ
   */
  authorizeCte(request: AuthorizeCteRequest): Promise<Result<AuthorizeCteResponse, string>>;
  
  /**
   * Cancela CTe autorizado na SEFAZ
   * 
   * @param request Dados do cancelamento
   * @returns Result com resposta de cancelamento ou erro
   */
  cancelCte(request: CancelCteRequest): Promise<Result<CancelCteResponse, string>>;
  
  /**
   * Consulta status de CTe na SEFAZ
   * 
   * @param request Dados da consulta (chave + ambiente)
   * @returns Result com status detalhado ou erro
   */
  queryCteStatus(request: QueryCteStatusRequest): Promise<Result<QueryCteStatusResponse, string>>;
  
  /**
   * Inutiliza numeração de CTe na SEFAZ
   * 
   * @param request Dados da inutilização (série, números, justificativa)
   * @returns Result com protocolo de inutilização ou erro
   */
  inutilizeCte(request: InutilizeCteRequest): Promise<Result<InutilizeCteResponse, string>>;
  
  // ═══════════════════════════════════════════════════════════
  // NFe
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Consulta distribuição DFe (NFes destinadas)
   */
  queryDistribuicaoDFe(request: QueryNfeRequest): Promise<Result<NfeDistribuicaoResponse[], string>>;
  
  /**
   * Registra manifestação de NFe
   */
  manifestNfe(request: ManifestNfeRequest): Promise<Result<void, string>>;
  
  // ═══════════════════════════════════════════════════════════
  // MDFe
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Autoriza MDFe na SEFAZ
   */
  authorizeMdfe(mdfeXml: string, environment: 'production' | 'homologation'): Promise<Result<AuthorizeMdfeResponse, string>>;
  
  /**
   * Encerra MDFe na SEFAZ
   */
  closeMdfe(mdfeKey: string, environment: 'production' | 'homologation'): Promise<Result<void, string>>;
}

