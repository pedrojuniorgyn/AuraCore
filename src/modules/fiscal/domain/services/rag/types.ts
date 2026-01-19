/**
 * RAG Types - Domain Types
 *
 * Tipos para o sistema RAG de consulta de legislação fiscal.
 *
 * @module fiscal/domain/services/rag
 * @see E-Agent-Fase-D4
 */

// ============================================================================
// LEGISLATION CATEGORIES
// ============================================================================

/**
 * Categorias de legislação fiscal brasileira.
 */
export type LegislationCategory =
  | 'ICMS'
  | 'PIS_COFINS'
  | 'IPI'
  | 'ISS'
  | 'IRPJ'
  | 'CTe'
  | 'NFe'
  | 'NFSe'
  | 'MDFe'
  | 'SPED'
  | 'REFORMA_TRIBUTARIA'
  | 'GERAL';

// ============================================================================
// DOCUMENT CHUNK
// ============================================================================

/**
 * Metadados de um chunk de documento.
 */
export interface ChunkMetadata {
  /** Número da página no documento original */
  pageNumber: number;

  /** Índice do chunk (0-based) */
  chunkIndex: number;

  /** Total de chunks no documento */
  totalChunks: number;

  /** Fonte do documento (Ex: "Lei Complementar 87/96") */
  source: string;

  /** Seção detectada (Ex: "Art. 12, §1º") */
  section?: string;

  /** Categoria da legislação */
  category: LegislationCategory;
}

/**
 * Chunk de documento para indexação no vector store.
 */
export interface DocumentChunk {
  /** ID único do chunk (formato: {documentId}_chunk_{index}) */
  id: string;

  /** ID do documento pai */
  documentId: string;

  /** Título do documento */
  documentTitle: string;

  /** Conteúdo textual do chunk */
  content: string;

  /** Metadados do chunk */
  metadata: ChunkMetadata;

  /** Embedding vetorial (opcional, adicionado após processamento) */
  embedding?: number[];
}

// ============================================================================
// INDEXED DOCUMENT
// ============================================================================

/**
 * Documento de legislação indexado no sistema.
 */
export interface IndexedDocument {
  /** ID único do documento */
  id: string;

  /** Título do documento */
  title: string;

  /** Nome do arquivo original */
  fileName: string;

  /** Categoria da legislação */
  category: LegislationCategory;

  /** Número total de chunks gerados */
  totalChunks: number;

  /** Data/hora da indexação */
  indexedAt: Date;

  /** Metadados de processamento */
  metadata: {
    /** Número de páginas do PDF */
    pageCount: number;
    /** Tamanho do arquivo em bytes */
    fileSize: number;
    /** Tempo de processamento em ms */
    processingTimeMs: number;
  };
}

// ============================================================================
// SEARCH RESULTS
// ============================================================================

/**
 * Resultado de busca vetorial.
 */
export interface SearchResult {
  /** Chunk encontrado */
  chunk: DocumentChunk;

  /** Score de similaridade (0-1, maior = mais relevante) */
  score: number;

  /** Distância vetorial (menor = mais similar) */
  distance: number;
}

// ============================================================================
// RAG RESPONSE
// ============================================================================

/**
 * Citação de fonte na resposta.
 */
export interface Citation {
  /** Título do documento citado */
  documentTitle: string;

  /** Fonte específica (Ex: "Lei Kandir, Art. 12") */
  source: string;

  /** Trecho citado do documento */
  excerpt: string;

  /** Número da página */
  pageNumber: number;

  /** Score de relevância (0-1) */
  relevanceScore: number;
}

/**
 * Resposta do sistema RAG com citações.
 */
export interface RAGResponse {
  /** Resposta gerada */
  answer: string;

  /** Citações das fontes utilizadas */
  citations: Citation[];

  /** Confiança da resposta (0-1) */
  confidence: number;

  /** Tempo de processamento em ms */
  processingTimeMs: number;
}

// ============================================================================
// RAG CONFIG
// ============================================================================

/**
 * Configuração do sistema RAG.
 */
export interface RAGConfig {
  /** Tamanho do chunk em caracteres (default: 1000) */
  chunkSize: number;

  /** Sobreposição entre chunks em caracteres (default: 200) */
  chunkOverlap: number;

  /** Quantidade de chunks a recuperar na busca (default: 5) */
  topK: number;

  /** Score mínimo para incluir resultado (default: 0.7) */
  minScore: number;

  /** Modelo de embedding (Ex: "text-embedding-3-small") */
  embeddingModel: string;

  /** Modelo LLM para geração (Ex: "claude-sonnet-4-20250514") */
  llmModel: string;
}

/**
 * Configuração padrão do RAG.
 */
export const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  topK: 5,
  minScore: 0.7,
  embeddingModel: 'text-embedding-3-small',
  llmModel: 'claude-sonnet-4-20250514',
};

// ============================================================================
// CHUNKING OPTIONS
// ============================================================================

/**
 * Opções para chunking de documento.
 */
export interface ChunkingOptions {
  /** Tamanho do chunk em caracteres */
  chunkSize?: number;

  /** Sobreposição entre chunks */
  chunkOverlap?: number;

  /** Detectar seções automaticamente */
  detectSections?: boolean;
}
