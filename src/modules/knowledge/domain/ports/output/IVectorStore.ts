/**
 * IVectorStore - Output Port para armazenamento vetorial
 * 
 * Interface que define o contrato para implementações de
 * vector store (SQLite, Pinecone, Weaviate, pgvector, etc.)
 * 
 * @module knowledge/domain/ports/output
 */

import type { Result } from '@/shared/domain';
import type {
  DocumentChunk,
  DocumentMetadata,
  SearchOptions,
  SearchResult,
} from '../../types';

/**
 * Interface para armazenamento e busca vetorial
 */
export interface IVectorStore {
  /**
   * Adiciona ou atualiza chunks no vector store
   * @param chunks - Chunks a serem inseridos/atualizados
   */
  upsert(chunks: DocumentChunk[]): Promise<Result<void, string>>;

  /**
   * Busca chunks similares à query
   * @param options - Opções de busca (query, topK, filtros)
   */
  search(options: SearchOptions): Promise<Result<SearchResult[], string>>;

  /**
   * Remove todos os chunks de um documento
   * @param documentId - ID do documento
   */
  deleteByDocumentId(documentId: string): Promise<Result<void, string>>;

  /**
   * Verifica se documento já está indexado
   * @param documentId - ID do documento
   */
  documentExists(documentId: string): Promise<boolean>;

  /**
   * Salva metadados do documento
   * @param document - Metadados do documento
   */
  saveDocument(document: DocumentMetadata): Promise<Result<void, string>>;

  /**
   * Busca metadados de um documento
   * @param documentId - ID do documento
   */
  getDocument(documentId: string): Promise<Result<DocumentMetadata | null, string>>;
}
