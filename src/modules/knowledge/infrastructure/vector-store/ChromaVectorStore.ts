/**
 * ChromaVectorStore - Infrastructure Implementation
 *
 * Implementação de vector store usando ChromaDB para busca por similaridade.
 *
 * @module knowledge/infrastructure/vector-store
 * @see Phase D.2 - Vector Store Implementation
 *
 * Características:
 * - Busca por similaridade de cosseno
 * - Filtros por metadados (multi-tenancy)
 * - Persistência em disco
 * - Health check endpoint
 *
 * @see https://docs.trychroma.com/
 */

import { ChromaClient, type Collection, type Where } from 'chromadb';
import { Result } from '@/shared/domain';
import type { IVectorStore } from '../../domain/ports/output/IVectorStore';
import type {
  DocumentChunk,
  DocumentMetadata,
  SearchOptions,
  SearchResult,
  DocumentType,
} from '../../domain/types';

// ============================================================================
// TYPES
// ============================================================================

interface ChromaConfig {
  /** Host do ChromaDB (default: localhost) */
  host?: string;
  /** Porta do ChromaDB (default: 8001) */
  port?: number;
  /** Token de autenticação (opcional) */
  authToken?: string;
  /** Nome da collection (default: auracore_knowledge) */
  collectionName?: string;
}

// Tipo para metadados do ChromaDB (não suporta objetos aninhados)
type ChromaMetadata = Record<string, string | number | boolean>;

// Tipo para resultado da query do ChromaDB
interface ChromaQueryResult {
  ids: string[][];
  documents?: (string | null)[][];
  metadatas?: (ChromaMetadata | null)[][];
  distances?: number[][];
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Vector Store usando ChromaDB
 *
 * Para produção com alto volume, considerar ChromaDB em cluster
 * ou migrar para Pinecone/Weaviate.
 */
export class ChromaVectorStore implements IVectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private readonly collectionName: string;
  private isInitialized = false;

  // Cache de documentos (ChromaDB não armazena documentos separadamente)
  private documentCache: Map<string, DocumentMetadata> = new Map();

  constructor(private readonly config: ChromaConfig = {}) {
    const host = config.host ?? 'localhost';
    const port = config.port ?? 8001; // Porta do docker-compose existente

    this.client = new ChromaClient({
      path: `http://${host}:${port}`,
    });

    this.collectionName = config.collectionName ?? 'auracore_knowledge';
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Aguarda ChromaDB estar disponível com retry
   * @param maxRetries Número máximo de tentativas (default: 10)
   * @param delayMs Delay entre tentativas em ms (default: 2000)
   */
  private async waitForChromaDB(maxRetries = 10, delayMs = 2000): Promise<Result<void, string>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.heartbeat();
        return Result.ok(undefined);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        
        if (attempt === maxRetries) {
          return Result.fail(`ChromaDB not available after ${maxRetries} retries: ${message}`);
        }
        
        // Wait between retries
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return Result.fail('ChromaDB connection failed');
  }

  /**
   * Garante que a collection está inicializada
   */
  private async ensureInitialized(): Promise<Result<void, string>> {
    if (this.isInitialized && this.collection) {
      return Result.ok(undefined);
    }

    // Aguardar ChromaDB estar pronto com retry
    const connectionResult = await this.waitForChromaDB();
    if (Result.isFail(connectionResult)) {
      return Result.fail(connectionResult.error);
    }

    try {
      // Criar ou obter collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          'hnsw:space': 'cosine',
          description: 'AuraCore Knowledge Base - RAG System',
        },
      });

      this.isInitialized = true;
      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Falha ao inicializar ChromaDB: ${message}`);
    }
  }

  // ==========================================================================
  // IVectorStore INTERFACE
  // ==========================================================================

  /**
   * Adiciona/atualiza chunks no vector store
   */
  async upsert(chunks: DocumentChunk[]): Promise<Result<void, string>> {
    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return Result.fail(initResult.error);
    }

    if (chunks.length === 0) {
      return Result.ok(undefined);
    }

    try {
      // Separar chunks com e sem embedding
      const chunksWithEmbedding = chunks.filter(
        (c) => c.embedding && c.embedding.length > 0
      );

      if (chunksWithEmbedding.length === 0) {
        // ChromaDB requer embeddings - se não tiver, não pode inserir
        return Result.fail(
          'ChromaDB requer embeddings. Use EmbeddingService antes de upsert.'
        );
      }

      await this.collection!.upsert({
        ids: chunksWithEmbedding.map((c) => c.id),
        embeddings: chunksWithEmbedding.map((c) => c.embedding!),
        documents: chunksWithEmbedding.map((c) => c.content),
        metadatas: chunksWithEmbedding.map((c) => this.chunkToMetadata(c)),
      });

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao inserir chunks: ${message}`);
    }
  }

  /**
   * Busca chunks similares
   */
  async search(options: SearchOptions): Promise<Result<SearchResult[], string>> {
    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return Result.fail(initResult.error);
    }

    try {
      const topK = options.topK ?? 5;
      const whereFilter = this.buildWhereFilter(options.filters);

      // Buscar por embedding (deve ser gerado externamente)
      // Se não houver embedding, ChromaDB não pode fazer busca vetorial
      const queryEmbedding = (options as SearchOptionsWithEmbedding).queryEmbedding;

      if (!queryEmbedding || queryEmbedding.length === 0) {
        return Result.fail(
          'ChromaDB requer queryEmbedding para busca. Use EmbeddingService.'
        );
      }

      const results = await this.collection!.query({
        nResults: topK,
        queryEmbeddings: [queryEmbedding],
        include: ['documents', 'metadatas', 'distances'],
        ...(whereFilter ? { where: whereFilter as Where } : {}),
      });

      // Converter resultados
      const searchResults = this.convertResults(
        results as ChromaQueryResult,
        options.minScore
      );

      return Result.ok(searchResults);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na busca: ${message}`);
    }
  }

  /**
   * Remove chunks de um documento
   */
  async deleteByDocumentId(documentId: string): Promise<Result<void, string>> {
    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return Result.fail(initResult.error);
    }

    try {
      // Buscar IDs dos chunks do documento
      const existing = await this.collection!.get({
        where: { documentId: { $eq: documentId } },
        include: [],
      });

      if (existing.ids.length > 0) {
        await this.collection!.delete({
          ids: existing.ids,
        });
      }

      // Remover do cache
      this.documentCache.delete(documentId);

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao deletar: ${message}`);
    }
  }

  /**
   * Verifica se documento existe
   */
  async documentExists(documentId: string): Promise<boolean> {
    // Verificar cache primeiro
    if (this.documentCache.has(documentId)) {
      return true;
    }

    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return false;
    }

    try {
      const result = await this.collection!.get({
        where: { documentId: { $eq: documentId } },
        limit: 1,
        include: [],
      });

      return result.ids.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Salva metadados do documento
   * ChromaDB armazena metadados junto com chunks, então mantemos cache
   */
  async saveDocument(document: DocumentMetadata): Promise<Result<void, string>> {
    this.documentCache.set(document.id, document);
    return Result.ok(undefined);
  }

  /**
   * Busca metadados de um documento
   */
  async getDocument(
    documentId: string
  ): Promise<Result<DocumentMetadata | null, string>> {
    // Verificar cache
    const cached = this.documentCache.get(documentId);
    if (cached) {
      return Result.ok(cached);
    }

    // Tentar reconstruir do ChromaDB
    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return Result.fail(initResult.error);
    }

    try {
      const result = await this.collection!.get({
        where: { documentId: { $eq: documentId } },
        limit: 1,
        include: ['metadatas'],
      });

      if (result.ids.length === 0 || !result.metadatas?.[0]) {
        return Result.ok(null);
      }

      const metadata = result.metadatas[0] as ChromaMetadata;

      // Reconstruir DocumentMetadata do ChromaDB metadata
      const doc: DocumentMetadata = {
        id: documentId,
        title: String(metadata.title ?? 'Sem título'),
        type: (metadata.documentType as DocumentType) ?? 'LEGISLATION',
        legislationType: metadata.legislationType as DocumentMetadata['legislationType'],
        source: String(metadata.source ?? ''),
        tags: metadata.tags ? String(metadata.tags).split(',') : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Cachear
      this.documentCache.set(documentId, doc);

      return Result.ok(doc);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar documento: ${message}`);
    }
  }

  // ==========================================================================
  // MÉTODOS ADICIONAIS
  // ==========================================================================

  /**
   * Retorna contagem de chunks
   */
  async count(): Promise<number> {
    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return 0;
    }

    try {
      return await this.collection!.count();
    } catch {
      return 0;
    }
  }

  /**
   * Verifica saúde da conexão
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retorna estatísticas
   */
  async getStats(): Promise<{
    chunkCount: number;
    documentCount: number;
    collectionName: string;
    isConnected: boolean;
  }> {
    const isConnected = await this.healthCheck();
    const chunkCount = await this.count();

    return {
      chunkCount,
      documentCount: this.documentCache.size,
      collectionName: this.collectionName,
      isConnected,
    };
  }

  /**
   * Limpa toda a collection (use com cuidado!)
   */
  async clear(): Promise<Result<void, string>> {
    const initResult = await this.ensureInitialized();
    if (Result.isFail(initResult)) {
      return Result.fail(initResult.error);
    }

    try {
      // Deletar e recriar collection
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          'hnsw:space': 'cosine',
          description: 'AuraCore Knowledge Base - RAG System',
        },
      });

      this.documentCache.clear();

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao limpar collection: ${message}`);
    }
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  /**
   * Converte chunk para metadados do ChromaDB (flat structure)
   */
  private chunkToMetadata(chunk: DocumentChunk): ChromaMetadata {
    const metadata: ChromaMetadata = {
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
    };

    if (chunk.startPage !== undefined) {
      metadata.startPage = chunk.startPage;
    }

    if (chunk.endPage !== undefined) {
      metadata.endPage = chunk.endPage;
    }

    // Flatten metadata adicional (ChromaDB não suporta nested objects)
    if (chunk.metadata) {
      for (const [key, value] of Object.entries(chunk.metadata)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          metadata[key] = value;
        } else if (Array.isArray(value)) {
          // Arrays viram strings separadas por vírgula
          metadata[key] = value.join(',');
        }
      }
    }

    return metadata;
  }

  /**
   * Constrói filtro where para ChromaDB
   */
  private buildWhereFilter(
    filters?: SearchOptions['filters']
  ): Record<string, unknown> | undefined {
    if (!filters) return undefined;

    const conditions: Record<string, unknown>[] = [];

    if (filters.documentType && filters.documentType.length > 0) {
      if (filters.documentType.length === 1) {
        conditions.push({ documentType: { $eq: filters.documentType[0] } });
      } else {
        conditions.push({ documentType: { $in: filters.documentType } });
      }
    }

    if (filters.legislationType && filters.legislationType.length > 0) {
      if (filters.legislationType.length === 1) {
        conditions.push({ legislationType: { $eq: filters.legislationType[0] } });
      } else {
        conditions.push({ legislationType: { $in: filters.legislationType } });
      }
    }

    if (filters.organizationId !== undefined) {
      conditions.push({ organizationId: { $eq: filters.organizationId } });
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];

    return { $and: conditions };
  }

  /**
   * Converte resultados do ChromaDB para SearchResult[]
   */
  private convertResults(
    results: ChromaQueryResult,
    minScore?: number
  ): SearchResult[] {
    const searchResults: SearchResult[] = [];

    if (!results.ids?.[0]) {
      return searchResults;
    }

    for (let i = 0; i < results.ids[0].length; i++) {
      const id = results.ids[0][i];
      const content = results.documents?.[0]?.[i] ?? '';
      const metadata = (results.metadatas?.[0]?.[i] ?? {}) as ChromaMetadata;
      const distance = results.distances?.[0]?.[i] ?? 1;

      // Converter distância de cosseno para score (0-1)
      // ChromaDB: 0 = idêntico, 2 = oposto (para cosine)
      const score = 1 - distance / 2;

      // Filtrar por score mínimo
      if (minScore !== undefined && score < minScore) {
        continue;
      }

      const documentId = String(metadata.documentId ?? '');

      searchResults.push({
        chunk: {
          id,
          documentId,
          content,
          chunkIndex: Number(metadata.chunkIndex ?? 0),
          startPage: metadata.startPage !== undefined ? Number(metadata.startPage) : undefined,
          endPage: metadata.endPage !== undefined ? Number(metadata.endPage) : undefined,
          metadata: metadata as unknown as Record<string, unknown>,
        },
        document: this.documentCache.get(documentId) ?? {
          id: documentId,
          title: String(metadata.title ?? 'Sem título'),
          type: (metadata.documentType as DocumentType) ?? 'LEGISLATION',
          legislationType: metadata.legislationType as DocumentMetadata['legislationType'],
          source: String(metadata.source ?? ''),
          tags: metadata.tags ? String(metadata.tags).split(',') : [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score,
      });
    }

    return searchResults;
  }
}

// ============================================================================
// EXTENDED SEARCH OPTIONS (para uso interno)
// ============================================================================

/**
 * SearchOptions com embedding para busca vetorial
 */
interface SearchOptionsWithEmbedding extends SearchOptions {
  /** Embedding da query (gerado pelo EmbeddingService) */
  queryEmbedding?: number[];
}

export type { SearchOptionsWithEmbedding };
