/**
 * Tipos para o módulo de Knowledge/RAG
 * 
 * Sistema de Retrieval-Augmented Generation para consulta
 * de legislação fiscal brasileira.
 * 
 * @module knowledge/domain/types
 * @see Phase D8 - RAG for Fiscal Legislation
 */

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

/**
 * Tipo de documento no knowledge base
 */
export type DocumentType =
  | 'LEGISLATION'       // Leis, decretos, instruções normativas
  | 'MANUAL'            // Manuais do SPED, CTe, NFe
  | 'CONTRACT_TEMPLATE' // Templates de contrato
  | 'INTERNAL_POLICY'   // Políticas internas
  | 'TECHNICAL_DOC';    // Documentação técnica

/**
 * Tipo de legislação fiscal brasileira
 */
export type LegislationType =
  | 'ICMS'              // Lei Kandir, convênios CONFAZ
  | 'PIS_COFINS'        // Leis 10.637/02 e 10.833/03
  | 'IPI'               // Regulamento do IPI
  | 'IRPJ_CSLL'         // Imposto de Renda PJ
  | 'ISS'               // LC 116/03
  | 'REFORMA_2026'      // IBS, CBS, IS
  | 'SPED'              // Manuais SPED
  | 'CTE'               // Legislação CTe
  | 'NFE'               // Legislação NFe
  | 'TRABALHISTA'       // CLT, jornada motorista
  | 'OUTROS';

// ============================================================================
// DOCUMENT METADATA
// ============================================================================

/**
 * Metadados de um documento indexado
 */
export interface DocumentMetadata {
  /** ID único do documento */
  id: string;
  
  /** Título do documento */
  title: string;
  
  /** Tipo de documento */
  type: DocumentType;
  
  /** Tipo de legislação (se aplicável) */
  legislationType?: LegislationType;
  
  /** URL ou caminho original */
  source: string;
  
  /** Versão do documento */
  version?: string;
  
  /** Data de vigência */
  effectiveDate?: Date;
  
  /** Data de expiração (se revogado) */
  expirationDate?: Date;
  
  /** ID da organização (null = documento global) */
  organizationId?: number;
  
  /** Tags para busca */
  tags: string[];
  
  /** Data de criação no sistema */
  createdAt: Date;
  
  /** Data de última atualização */
  updatedAt: Date;
}

// ============================================================================
// DOCUMENT CHUNK
// ============================================================================

/**
 * Chunk de documento para indexação vetorial
 */
export interface DocumentChunk {
  /** ID único do chunk */
  id: string;
  
  /** ID do documento pai */
  documentId: string;
  
  /** Conteúdo textual do chunk */
  content: string;
  
  /** Índice sequencial do chunk no documento */
  chunkIndex: number;
  
  /** Página inicial (se aplicável) */
  startPage?: number;
  
  /** Página final (se aplicável) */
  endPage?: number;
  
  /** Vetor de embedding (gerado pelo embedding service) */
  embedding?: number[];
  
  /** Metadados adicionais */
  metadata: Record<string, unknown>;
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Resultado de busca vetorial
 */
export interface SearchResult {
  /** Chunk encontrado */
  chunk: DocumentChunk;
  
  /** Metadados do documento */
  document: DocumentMetadata;
  
  /** Score de similaridade (0-1) */
  score: number;
  
  /** Trechos destacados (opcional) */
  highlights?: string[];
}

/**
 * Opções de busca
 */
export interface SearchOptions {
  /** Query de busca */
  query: string;
  
  /** Número máximo de resultados (default: 5) */
  topK?: number;
  
  /** Score mínimo para incluir (default: 0.5) */
  minScore?: number;
  
  /** Filtros de busca */
  filters?: SearchFilters;
}

/**
 * Filtros para refinar busca
 */
export interface SearchFilters {
  /** Filtrar por tipo de documento */
  documentType?: DocumentType[];
  
  /** Filtrar por tipo de legislação */
  legislationType?: LegislationType[];
  
  /** Filtrar por organização */
  organizationId?: number;
  
  /** Filtrar por tags */
  tags?: string[];
  
  /** Data de vigência mínima */
  effectiveDateFrom?: Date;
  
  /** Data de vigência máxima */
  effectiveDateTo?: Date;
}

// ============================================================================
// CHUNKING OPTIONS
// ============================================================================

/**
 * Opções para chunking de documentos
 */
export interface ChunkOptions {
  /** Tamanho máximo do chunk em caracteres (default: 1000) */
  maxChunkSize?: number;
  
  /** Overlap entre chunks em caracteres (default: 200) */
  chunkOverlap?: number;
  
  /** Separadores para quebra (default: ['\n\n', '\n', '. ', ' ']) */
  separators?: string[];
}

/**
 * Configurações padrão de chunking
 */
export const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' '],
};

// ============================================================================
// LEGISLATION ANSWER
// ============================================================================

/**
 * Resposta estruturada de consulta à legislação
 */
export interface LegislationAnswer {
  /** Resposta formatada */
  answer: string;
  
  /** Fontes consultadas */
  sources: Array<{
    title: string;
    excerpt: string;
    relevance: number;
  }>;
  
  /** Confiança da resposta (0-1) */
  confidence: number;
  
  /** Aviso legal */
  disclaimer: string;
}
