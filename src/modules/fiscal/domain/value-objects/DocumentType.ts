/**
 * Tipos de documentos fiscais eletrônicos brasileiros
 */
export type DocumentType = 'NFE' | 'CTE' | 'MDFE' | 'NFSE';

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
export type DocumentModel = '55' | '57' | '58' | '65';

/**
 * Descrição dos tipos de documento
 */
export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  NFE: 'Nota Fiscal Eletrônica',
  CTE: 'Conhecimento de Transporte Eletrônico',
  MDFE: 'Manifesto Eletrônico de Documentos Fiscais',
  NFSE: 'Nota Fiscal de Serviço Eletrônica',
};

/**
 * Modelo por tipo de documento
 */
export const DOCUMENT_MODEL_BY_TYPE: Record<DocumentType, DocumentModel> = {
  NFE: '55',
  CTE: '57',
  MDFE: '58',
  NFSE: '65', // Modelo simplificado
};

/**
 * Verifica se é um tipo de documento válido
 */
export function isValidDocumentType(type: string): type is DocumentType {
  return ['NFE', 'CTE', 'MDFE', 'NFSE'].includes(type);
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
 * Transições de status permitidas
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['PROCESSING', 'DRAFT'],
  PROCESSING: ['AUTHORIZED', 'REJECTED'],
  AUTHORIZED: ['CANCELLED', 'CORRECTED'],
  REJECTED: ['DRAFT'],
  CANCELLED: [],
  CORRECTED: ['CANCELLED'],
};

/**
 * Verifica se transição de status é permitida
 */
export function canTransitionTo(from: DocumentStatus, to: DocumentStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

