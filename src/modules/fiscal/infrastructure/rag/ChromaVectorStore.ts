/**
 * ChromaVectorStore - Infrastructure Implementation
 *
 * Implementação de IVectorStore usando ChromaDB.
 *
 * @module fiscal/infrastructure/rag
 * @see IVectorStore (domain port)
 * @see E-Agent-Fase-D4
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IVectorStore,
  VectorSearchOptions,
} from '@/modules/fiscal/domain/ports/output/IVectorStore';
import type {
  DocumentChunk,
  SearchResult,
  IndexedDocument,
} from '@/modules/fiscal/domain/services/rag/types';

// ============================================================================
// TYPES
// ============================================================================

interface ChromaQueryResponse {
  ids: string[][];
  embeddings: number[][] | null;
  documents: (string | null)[][];
  metadatas: (Record<string, unknown> | null)[][];
  distances: number[][];
}

interface ChromaCollection {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Implementação de IVectorStore usando ChromaDB.
 *
 * ChromaDB é um vector database open source, ideal para RAG.
 */
@injectable()
export class ChromaVectorStore implements IVectorStore {
  private readonly baseUrl: string;
  private readonly collectionName: string;
  private collectionId: string | null = null;

  constructor() {
    this.baseUrl = process.env.CHROMA_URL ?? 'http://localhost:8001';
    this.collectionName = process.env.CHROMA_COLLECTION ?? 'legislation';
  }

  /**
   * Adiciona ou atualiza chunks no índice.
   */
  async upsert(chunks: DocumentChunk[]): Promise<Result<void, string>> {
    if (!chunks || chunks.length === 0) {
      return Result.fail('Nenhum chunk para indexar');
    }

    // Verificar que todos os chunks têm embedding
    const missingEmbedding = chunks.find((c) => !c.embedding || c.embedding.length === 0);
    if (missingEmbedding) {
      return Result.fail(`Chunk ${missingEmbedding.id} não tem embedding`);
    }

    try {
      // Garantir que collection existe
      const ensureResult = await this.ensureCollection();
      if (Result.isFail(ensureResult)) {
        return ensureResult;
      }

      // Preparar dados para upsert
      const ids = chunks.map((c) => c.id);
      const embeddings = chunks.map((c) => c.embedding as number[]);
      const documents = chunks.map((c) => c.content);
      const metadatas = chunks.map((c) => ({
        documentId: c.documentId,
        documentTitle: c.documentTitle,
        pageNumber: c.metadata.pageNumber,
        chunkIndex: c.metadata.chunkIndex,
        totalChunks: c.metadata.totalChunks,
        source: c.metadata.source,
        section: c.metadata.section ?? '',
        category: c.metadata.category,
      }));

      const response = await fetch(
        `${this.baseUrl}/api/v1/collections/${this.collectionId}/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids,
            embeddings,
            documents,
            metadatas,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`ChromaDB upsert error (${response.status}): ${errorText}`);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB upsert error: ${message}`);
    }
  }

  /**
   * Busca chunks similares.
   */
  async search(
    queryEmbedding: number[],
    options: VectorSearchOptions
  ): Promise<Result<SearchResult[], string>> {
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return Result.fail('Query embedding vazio');
    }

    try {
      // Garantir que collection existe
      const ensureResult = await this.ensureCollection();
      if (Result.isFail(ensureResult)) {
        return ensureResult;
      }

      // Construir where clause se tiver filtros
      const whereClause: Record<string, unknown> = {};
      if (options.filter?.documentId) {
        whereClause.documentId = options.filter.documentId;
      }
      if (options.filter?.category) {
        whereClause.category = options.filter.category;
      }

      const body: Record<string, unknown> = {
        query_embeddings: [queryEmbedding],
        n_results: options.topK,
        include: ['documents', 'metadatas', 'distances'],
      };

      if (Object.keys(whereClause).length > 0) {
        body.where = whereClause;
      }

      const response = await fetch(
        `${this.baseUrl}/api/v1/collections/${this.collectionId}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`ChromaDB query error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as ChromaQueryResponse;
      const results: SearchResult[] = [];

      // ChromaDB retorna arrays aninhados (um para cada query)
      const ids = data.ids?.[0] ?? [];
      const documents = data.documents?.[0] ?? [];
      const metadatas = data.metadatas?.[0] ?? [];
      const distances = data.distances?.[0] ?? [];

      for (let i = 0; i < ids.length; i++) {
        // Converter distância para score (ChromaDB usa L2, menor = melhor)
        // Score = 1 / (1 + distance) para normalizar entre 0 e 1
        const distance = distances[i] ?? 0;
        const score = 1 / (1 + distance);

        // Filtrar por minScore se especificado
        if (options.minScore && score < options.minScore) {
          continue;
        }

        const metadata = metadatas[i] ?? {};
        results.push({
          chunk: {
            id: ids[i],
            documentId: (metadata.documentId as string) ?? '',
            documentTitle: (metadata.documentTitle as string) ?? '',
            content: documents[i] ?? '',
            metadata: {
              pageNumber: (metadata.pageNumber as number) ?? 1,
              chunkIndex: (metadata.chunkIndex as number) ?? 0,
              totalChunks: (metadata.totalChunks as number) ?? 0,
              source: (metadata.source as string) ?? '',
              section: metadata.section as string | undefined,
              category: (metadata.category as string) ?? 'GERAL',
            },
          },
          score,
          distance,
        });
      }

      return Result.ok(results);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB search error: ${message}`);
    }
  }

  /**
   * Remove chunks de um documento.
   */
  async deleteByDocumentId(documentId: string): Promise<Result<void, string>> {
    if (!documentId) {
      return Result.fail('documentId é obrigatório');
    }

    try {
      const ensureResult = await this.ensureCollection();
      if (Result.isFail(ensureResult)) {
        return ensureResult;
      }

      const response = await fetch(
        `${this.baseUrl}/api/v1/collections/${this.collectionId}/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            where: { documentId },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`ChromaDB delete error (${response.status}): ${errorText}`);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB delete error: ${message}`);
    }
  }

  /**
   * Lista documentos indexados.
   */
  async listDocuments(): Promise<Result<IndexedDocument[], string>> {
    try {
      const ensureResult = await this.ensureCollection();
      if (Result.isFail(ensureResult)) {
        return ensureResult;
      }

      // ChromaDB não tem listagem nativa de documentos únicos
      // Precisamos fazer query com include metadatas e agrupar
      const response = await fetch(
        `${this.baseUrl}/api/v1/collections/${this.collectionId}/get`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            include: ['metadatas'],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`ChromaDB get error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        ids: string[];
        metadatas: (Record<string, unknown> | null)[];
      };

      // Agrupar por documentId
      const documentsMap = new Map<string, IndexedDocument>();

      for (const metadata of data.metadatas) {
        if (!metadata) continue;

        const documentId = metadata.documentId as string;
        if (!documentId || documentsMap.has(documentId)) continue;

        documentsMap.set(documentId, {
          id: documentId,
          title: (metadata.documentTitle as string) ?? documentId,
          fileName: documentId,
          category: (metadata.category as string) ?? 'GERAL',
          totalChunks: (metadata.totalChunks as number) ?? 0,
          indexedAt: new Date(),
          metadata: {
            pageCount: 0,
            fileSize: 0,
            processingTimeMs: 0,
          },
        });
      }

      return Result.ok(Array.from(documentsMap.values()));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB list error: ${message}`);
    }
  }

  /**
   * Conta total de chunks.
   */
  async count(): Promise<Result<number, string>> {
    try {
      const ensureResult = await this.ensureCollection();
      if (Result.isFail(ensureResult)) {
        return ensureResult;
      }

      const response = await fetch(
        `${this.baseUrl}/api/v1/collections/${this.collectionId}/count`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`ChromaDB count error (${response.status}): ${errorText}`);
      }

      const count = (await response.json()) as number;
      return Result.ok(count);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB count error: ${message}`);
    }
  }

  /**
   * Verifica saúde do serviço.
   */
  async healthCheck(): Promise<Result<boolean, string>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/heartbeat`);
      if (!response.ok) {
        return Result.fail(`ChromaDB unhealthy: ${response.status}`);
      }
      return Result.ok(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB health check failed: ${message}`);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Garante que a collection existe, criando se necessário.
   */
  private async ensureCollection(): Promise<Result<void, string>> {
    if (this.collectionId) {
      return Result.ok(undefined);
    }

    try {
      // Tentar obter collection existente
      const listResponse = await fetch(`${this.baseUrl}/api/v1/collections`);
      if (!listResponse.ok) {
        return Result.fail(`ChromaDB list collections error: ${listResponse.status}`);
      }

      const collections = (await listResponse.json()) as ChromaCollection[];
      const existing = collections.find((c) => c.name === this.collectionName);

      if (existing) {
        this.collectionId = existing.id;
        return Result.ok(undefined);
      }

      // Criar nova collection
      const createResponse = await fetch(`${this.baseUrl}/api/v1/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.collectionName,
          metadata: {
            description: 'Legislation RAG - AuraCore',
            created: new Date().toISOString(),
          },
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        return Result.fail(`ChromaDB create collection error: ${errorText}`);
      }

      const created = (await createResponse.json()) as ChromaCollection;
      this.collectionId = created.id;

      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`ChromaDB ensure collection error: ${message}`);
    }
  }
}
