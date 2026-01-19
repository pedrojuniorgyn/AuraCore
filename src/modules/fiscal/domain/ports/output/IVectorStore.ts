/**
 * Output Port: IVectorStore
 *
 * Interface para vector store (banco de dados vetorial).
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Infrastructure implementa Output Ports
 * @see E-Agent-Fase-D4
 */

import type { Result } from '@/shared/domain';
import type { DocumentChunk, SearchResult, IndexedDocument } from '../../services/rag/types';

/**
 * Opções para busca vetorial.
 */
export interface VectorSearchOptions {
  /** Número de resultados a retornar */
  topK: number;

  /** Score mínimo para incluir (0-1) */
  minScore?: number;

  /** Filtros de metadados */
  filter?: {
    documentId?: string;
    category?: string;
  };
}

/**
 * Interface para vector store.
 *
 * Implementações:
 * - ChromaVectorStore (local)
 * - PineconeVectorStore (cloud)
 */
export interface IVectorStore {
  /**
   * Adiciona ou atualiza chunks no índice.
   * Chunks com mesmo ID são sobrescritos.
   *
   * @param chunks - Lista de chunks com embeddings
   * @returns void ou erro
   */
  upsert(chunks: DocumentChunk[]): Promise<Result<void, string>>;

  /**
   * Busca chunks similares ao embedding da query.
   *
   * @param queryEmbedding - Vetor de embedding da pergunta
   * @param options - Opções de busca
   * @returns Lista de resultados ordenados por similaridade ou erro
   */
  search(
    queryEmbedding: number[],
    options: VectorSearchOptions
  ): Promise<Result<SearchResult[], string>>;

  /**
   * Remove todos os chunks de um documento.
   *
   * @param documentId - ID do documento
   * @returns void ou erro
   */
  deleteByDocumentId(documentId: string): Promise<Result<void, string>>;

  /**
   * Lista todos os documentos indexados.
   *
   * @returns Lista de documentos ou erro
   */
  listDocuments(): Promise<Result<IndexedDocument[], string>>;

  /**
   * Conta total de chunks no índice.
   *
   * @returns Número de chunks ou erro
   */
  count(): Promise<Result<number, string>>;

  /**
   * Verifica saúde do serviço.
   *
   * @returns true se disponível ou erro
   */
  healthCheck(): Promise<Result<boolean, string>>;
}
