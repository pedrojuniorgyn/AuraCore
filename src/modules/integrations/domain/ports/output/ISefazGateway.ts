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
 */
export interface ISefazGateway {
  // CTe
  authorizeCte(request: AuthorizeCteRequest): Promise<Result<AuthorizeCteResponse, string>>;
  cancelCte(request: CancelCteRequest): Promise<Result<void, string>>;
  queryCteStatus(cteKey: string, environment: 'production' | 'homologation'): Promise<Result<string, string>>;
  
  // NFe
  queryDistribuicaoDFe(request: QueryNfeRequest): Promise<Result<NfeDistribuicaoResponse[], string>>;
  manifestNfe(request: ManifestNfeRequest): Promise<Result<void, string>>;
  
  // MDFe
  authorizeMdfe(mdfeXml: string, environment: 'production' | 'homologation'): Promise<Result<AuthorizeMdfeResponse, string>>;
  closeMdfe(mdfeKey: string, environment: 'production' | 'homologation'): Promise<Result<void, string>>;
}

