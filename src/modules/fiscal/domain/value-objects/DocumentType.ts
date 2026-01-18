/**
 * Tipos de documentos fiscais eletrônicos brasileiros
 */
export type DocumentType = 'NFE' | 'NFCE' | 'CTE' | 'MDFE' | 'NFSE';

/**
 * Status do documento fiscal
 */
export type DocumentStatus = 
  | 'DRAFT'           // Rascunho (editável)
  | 'PENDING'         // Aguardando envio
  | 'PROCESSING'      // Em processamento na SEFAZ
  | 'AUTHORIZED'      // Autorizado
  | 'REJECTED'        // Rejeitado pela SEFAZ
  | 'CANCELLED'       // Cancelado
  | 'CORRECTED';      // Carta de correção emitida

/**
 * Modelo do documento (série)
 */
export type DocumentModel = '55' | '65' | '57' | '58';

/**
 * Descrição dos tipos de documento
 */
export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  NFE: 'Nota Fiscal Eletrônica',
  NFCE: 'Nota Fiscal de Consumidor Eletrônica',
  CTE: 'Conhecimento de Transporte Eletrônico',
  MDFE: 'Manifesto Eletrônico de Documentos Fiscais',
  NFSE: 'Nota Fiscal de Serviço Eletrônica',
};

/**
 * Modelo por tipo de documento
 */
export const DOCUMENT_MODEL_BY_TYPE: Record<DocumentType, DocumentModel> = {
  NFE: '55',
  NFCE: '65',
  CTE: '57',
  MDFE: '58',
  NFSE: '65', // Modelo simplificado
};

/**
 * Verifica se é um tipo de documento válido
 */
export function isValidDocumentType(type: string): type is DocumentType {
  return ['NFE', 'NFCE', 'CTE', 'MDFE', 'NFSE'].includes(type);
}

/**
 * Verifica se é um status válido
 */
export function isValidDocumentStatus(status: string): status is DocumentStatus {
  return [
    'DRAFT', 'PENDING', 'PROCESSING', 
    'AUTHORIZED', 'REJECTED', 'CANCELLED', 'CORRECTED'
  ].includes(status);
}

/**
 * Transições de status permitidas - PADRÃO (NFe, CTe, MDFe)
 * Estes documentos DEVEM passar por PROCESSING (exigência SEFAZ)
 */
const DEFAULT_STATUS_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['PROCESSING', 'DRAFT'], // DEVE ir para PROCESSING primeiro
  PROCESSING: ['AUTHORIZED', 'REJECTED'],
  AUTHORIZED: ['CANCELLED', 'CORRECTED'],
  REJECTED: ['DRAFT'],
  CANCELLED: [],
  CORRECTED: ['CANCELLED'],
};

/**
 * Transições de status permitidas - NFS-e
 * NFS-e pode pular PROCESSING (não usa SEFAZ)
 */
const NFSE_STATUS_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['PROCESSING', 'AUTHORIZED', 'REJECTED', 'DRAFT'], // Pode ir direto para AUTHORIZED
  PROCESSING: ['AUTHORIZED', 'REJECTED'],
  AUTHORIZED: ['CANCELLED', 'CORRECTED'],
  REJECTED: ['DRAFT'],
  CANCELLED: [],
  CORRECTED: ['CANCELLED'],
};

/**
 * Mantém compatibilidade com código existente
 * @deprecated Use canTransitionTo() com documentType
 */
export const ALLOWED_STATUS_TRANSITIONS = DEFAULT_STATUS_TRANSITIONS;

/**
 * Verifica se transição de status é permitida
 * @param from Status atual
 * @param to Novo status
 * @param documentType Tipo de documento (opcional, default: NFe/CTe/MDFe)
 */
export function canTransitionTo(
  from: DocumentStatus, 
  to: DocumentStatus,
  documentType?: DocumentType
): boolean {
  const transitions = documentType === 'NFSE' 
    ? NFSE_STATUS_TRANSITIONS 
    : DEFAULT_STATUS_TRANSITIONS;
  return transitions[from]?.includes(to) ?? false;
}

