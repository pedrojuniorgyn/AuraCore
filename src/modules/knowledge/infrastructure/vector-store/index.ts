/**
 * Vector Store Implementations - Barrel Export
 *
 * @module knowledge/infrastructure/vector-store
 */

import { ChromaVectorStore } from './ChromaVectorStore';
import { JsonVectorStore } from './JsonVectorStore';
import type { IVectorStore } from '../../domain/ports/output/IVectorStore';

export { ChromaVectorStore, type SearchOptionsWithEmbedding } from './ChromaVectorStore';
export { JsonVectorStore };

// Re-export interface
export type { IVectorStore };

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

type VectorStoreType = 'chroma' | 'json';

/**
 * Cria instância do VectorStore baseado no tipo
 *
 * @param type - Tipo de vector store ('chroma' ou 'json')
 * @returns Instância do vector store
 *
 * @example
 * ```typescript
 * // Usar ChromaDB (produção)
 * const store = createVectorStore('chroma');
 *
 * // Usar JSON (desenvolvimento sem Docker)
 * const store = createVectorStore('json');
 * ```
 */
export function createVectorStore(type?: VectorStoreType): IVectorStore {
  const storeType = type ?? (process.env.VECTOR_STORE_TYPE as VectorStoreType) ?? 'chroma';

  if (storeType === 'chroma') {
    return new ChromaVectorStore({
      host: process.env.CHROMA_HOST ?? 'localhost',
      port: parseInt(process.env.CHROMA_PORT ?? '8001', 10),
      authToken: process.env.CHROMA_AUTH_TOKEN,
      collectionName: process.env.CHROMA_COLLECTION ?? 'auracore_knowledge',
    });
  }

  // Fallback para JSON (desenvolvimento sem Docker)
  return new JsonVectorStore(
    process.env.JSON_VECTOR_STORE_PATH ?? 'data/knowledge/vectors.json'
  );
}

/**
 * Verifica se ChromaDB está configurado e acessível
 */
export async function isChromaAvailable(): Promise<boolean> {
  try {
    const store = new ChromaVectorStore({
      host: process.env.CHROMA_HOST ?? 'localhost',
      port: parseInt(process.env.CHROMA_PORT ?? '8001', 10),
    });
    return await store.healthCheck();
  } catch {
    return false;
  }
}
