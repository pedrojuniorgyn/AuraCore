/**
 * Testes Unitários - ChromaVectorStore
 *
 * @module tests/unit/modules/knowledge/infrastructure/vector-store
 * @see Phase D.2 - Vector Store Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import type { DocumentChunk } from '@/modules/knowledge/domain/types/knowledge.types';

// =============================================================================
// MOCKS
// =============================================================================

const mocks = vi.hoisted(() => ({
  heartbeat: vi.fn(),
  getOrCreateCollection: vi.fn(),
  upsert: vi.fn(),
  query: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  deleteCollection: vi.fn(),
}));

vi.mock('chromadb', () => {
  class MockChromaClient {
    constructor() {
      // Vazio
    }
    heartbeat() {
      return mocks.heartbeat();
    }
    getOrCreateCollection() {
      return mocks.getOrCreateCollection();
    }
    deleteCollection(args: { name: string }) {
      return mocks.deleteCollection(args);
    }
  }

  return {
    ChromaClient: MockChromaClient,
  };
});

import { ChromaVectorStore } from '@/modules/knowledge/infrastructure/vector-store/ChromaVectorStore';

// =============================================================================
// TESTS
// =============================================================================

describe('ChromaVectorStore', () => {
  let store: ChromaVectorStore;

  beforeEach(() => {
    // Reset todos os mocks
    Object.values(mocks).forEach((mock) => mock.mockReset());

    // Setup mock collection
    const mockCollection = {
      upsert: mocks.upsert,
      query: mocks.query,
      get: mocks.get,
      delete: mocks.delete,
      count: mocks.count,
    };

    mocks.heartbeat.mockResolvedValue(true);
    mocks.getOrCreateCollection.mockResolvedValue(mockCollection);
    mocks.upsert.mockResolvedValue(undefined);
    mocks.query.mockResolvedValue({
      ids: [['chunk_1', 'chunk_2']],
      documents: [['Conteúdo 1', 'Conteúdo 2']],
      metadatas: [
        [
          { documentId: 'doc_1', chunkIndex: 0, title: 'Documento 1' },
          { documentId: 'doc_1', chunkIndex: 1, title: 'Documento 1' },
        ],
      ],
      distances: [[0.1, 0.3]],
    });
    mocks.get.mockResolvedValue({
      ids: ['chunk_1'],
      metadatas: [{ documentId: 'doc_1', chunkIndex: 0 }],
    });
    mocks.delete.mockResolvedValue(undefined);
    mocks.count.mockResolvedValue(100);
    mocks.deleteCollection.mockResolvedValue(undefined);

    store = new ChromaVectorStore({
      host: 'localhost',
      port: 8001,
    });
  });

  // ===========================================================================
  // UPSERT
  // ===========================================================================

  describe('upsert', () => {
    it('deve inserir chunks com embedding', async () => {
      const chunks: DocumentChunk[] = [
        {
          id: 'chunk_1',
          documentId: 'doc_1',
          content: 'Conteúdo de teste',
          chunkIndex: 0,
          embedding: new Array(768).fill(0.1),
          metadata: { title: 'Teste' },
        },
      ];

      const result = await store.upsert(chunks);

      expect(Result.isOk(result)).toBe(true);
      expect(mocks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: ['chunk_1'],
          embeddings: [expect.any(Array)],
          documents: ['Conteúdo de teste'],
        })
      );
    });

    it('deve retornar ok para array vazio', async () => {
      const result = await store.upsert([]);
      expect(Result.isOk(result)).toBe(true);
      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it('deve falhar para chunks sem embedding', async () => {
      const chunks: DocumentChunk[] = [
        {
          id: 'chunk_1',
          documentId: 'doc_1',
          content: 'Sem embedding',
          chunkIndex: 0,
          metadata: {},
        },
      ];

      const result = await store.upsert(chunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('requer embeddings');
      }
    });

    it('deve tratar erro de conexão', async () => {
      // Criar store com retry rápido para teste
      const failStore = new ChromaVectorStore({
        host: 'localhost',
        port: 8001,
        maxRetries: 1,
        retryDelayMs: 0,
      });

      // Rejeitar TODAS as chamadas de heartbeat (não apenas a primeira)
      mocks.heartbeat.mockRejectedValue(new Error('Connection refused'));

      const chunks: DocumentChunk[] = [
        {
          id: 'chunk_1',
          documentId: 'doc_1',
          content: 'Conteúdo',
          chunkIndex: 0,
          embedding: new Array(768).fill(0.1),
          metadata: {},
        },
      ];

      const result = await failStore.upsert(chunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('ChromaDB not available');
      }
    });
  });

  // ===========================================================================
  // SEARCH
  // ===========================================================================

  describe('search', () => {
    it('deve buscar por embedding', async () => {
      const result = await store.search({
        query: 'teste',
        queryEmbedding: new Array(768).fill(0.1),
        topK: 5,
      } as Parameters<typeof store.search>[0] & { queryEmbedding: number[] });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].score).toBeGreaterThan(0);
        expect(result.value[0].chunk.id).toBe('chunk_1');
      }
    });

    it('deve calcular score corretamente', async () => {
      // Distance 0.1 -> Score = 1 - (0.1 / 2) = 0.95
      const result = await store.search({
        query: 'teste',
        queryEmbedding: new Array(768).fill(0.1),
        topK: 5,
      } as Parameters<typeof store.search>[0] & { queryEmbedding: number[] });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value[0].score).toBeCloseTo(0.95, 2);
      }
    });

    it('deve filtrar por score mínimo', async () => {
      const result = await store.search({
        query: 'teste',
        queryEmbedding: new Array(768).fill(0.1),
        topK: 5,
        minScore: 0.9,
      } as Parameters<typeof store.search>[0] & { queryEmbedding: number[] });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Apenas chunk_1 (score 0.95) passa, chunk_2 (score 0.85) não
        expect(result.value.length).toBe(1);
      }
    });

    it('deve falhar sem queryEmbedding', async () => {
      const result = await store.search({
        query: 'teste',
        topK: 5,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('requer queryEmbedding');
      }
    });

    it('deve aplicar filtros where', async () => {
      await store.search({
        query: 'teste',
        queryEmbedding: new Array(768).fill(0.1),
        topK: 5,
        filters: {
          documentType: ['LEGISLATION'],
          organizationId: 1,
        },
      } as Parameters<typeof store.search>[0] & { queryEmbedding: number[] });

      expect(mocks.query).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $and: expect.any(Array),
          }),
        })
      );
    });

    it('deve retornar array vazio se sem resultados', async () => {
      mocks.query.mockResolvedValueOnce({
        ids: [[]],
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      });

      const result = await store.search({
        query: 'inexistente',
        queryEmbedding: new Array(768).fill(0.1),
        topK: 5,
      } as Parameters<typeof store.search>[0] & { queryEmbedding: number[] });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  // ===========================================================================
  // DELETE BY DOCUMENT ID
  // ===========================================================================

  describe('deleteByDocumentId', () => {
    it('deve deletar chunks de um documento', async () => {
      const result = await store.deleteByDocumentId('doc_1');

      expect(Result.isOk(result)).toBe(true);
      expect(mocks.get).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { documentId: { $eq: 'doc_1' } },
        })
      );
      expect(mocks.delete).toHaveBeenCalledWith({ ids: ['chunk_1'] });
    });

    it('deve retornar ok mesmo se documento não existe', async () => {
      mocks.get.mockResolvedValueOnce({ ids: [] });

      const result = await store.deleteByDocumentId('inexistente');

      expect(Result.isOk(result)).toBe(true);
      expect(mocks.delete).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DOCUMENT EXISTS
  // ===========================================================================

  describe('documentExists', () => {
    it('deve retornar true se documento existe', async () => {
      const exists = await store.documentExists('doc_1');
      expect(exists).toBe(true);
    });

    it('deve retornar false se documento não existe', async () => {
      mocks.get.mockResolvedValueOnce({ ids: [] });

      const exists = await store.documentExists('inexistente');
      expect(exists).toBe(false);
    });

    it('deve usar cache de documentos', async () => {
      // Salvar documento no cache
      await store.saveDocument({
        id: 'cached_doc',
        title: 'Documento em cache',
        type: 'LEGISLATION',
        source: 'teste',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const exists = await store.documentExists('cached_doc');

      expect(exists).toBe(true);
      // Não deve chamar get pois está em cache
      expect(mocks.get).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SAVE & GET DOCUMENT
  // ===========================================================================

  describe('saveDocument', () => {
    it('deve salvar documento no cache', async () => {
      const result = await store.saveDocument({
        id: 'doc_test',
        title: 'Documento de Teste',
        type: 'LEGISLATION',
        source: 'teste.pdf',
        tags: ['icms', 'fiscal'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('getDocument', () => {
    it('deve retornar documento do cache', async () => {
      const doc = {
        id: 'doc_cache',
        title: 'Documento Cache',
        type: 'LEGISLATION' as const,
        source: 'cache.pdf',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await store.saveDocument(doc);
      const result = await store.getDocument('doc_cache');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value?.title).toBe('Documento Cache');
      }
    });

    it('deve reconstruir documento do ChromaDB se não em cache', async () => {
      mocks.get.mockResolvedValueOnce({
        ids: ['chunk_1'],
        metadatas: [
          {
            documentId: 'doc_chroma',
            title: 'Documento ChromaDB',
            documentType: 'MANUAL',
          },
        ],
      });

      const result = await store.getDocument('doc_chroma');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value?.title).toBe('Documento ChromaDB');
        expect(result.value?.type).toBe('MANUAL');
      }
    });

    it('deve retornar null se documento não existe', async () => {
      mocks.get.mockResolvedValueOnce({ ids: [], metadatas: [] });

      const result = await store.getDocument('inexistente');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  // ===========================================================================
  // COUNT
  // ===========================================================================

  describe('count', () => {
    it('deve retornar contagem de chunks', async () => {
      const count = await store.count();
      expect(count).toBe(100);
    });

    it('deve retornar 0 se erro', async () => {
      mocks.count.mockRejectedValueOnce(new Error('Count failed'));

      const count = await store.count();
      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  describe('healthCheck', () => {
    it('deve retornar true se ChromaDB disponível', async () => {
      const healthy = await store.healthCheck();
      expect(healthy).toBe(true);
    });

    it('deve retornar false se ChromaDB indisponível', async () => {
      mocks.heartbeat.mockRejectedValueOnce(new Error('Connection refused'));

      const healthy = await store.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  // ===========================================================================
  // GET STATS
  // ===========================================================================

  describe('getStats', () => {
    it('deve retornar estatísticas', async () => {
      const stats = await store.getStats();

      expect(stats.chunkCount).toBe(100);
      expect(stats.collectionName).toBe('auracore_knowledge');
      expect(stats.isConnected).toBe(true);
    });
  });

  // ===========================================================================
  // CLEAR
  // ===========================================================================

  describe('clear', () => {
    it('deve limpar collection', async () => {
      const result = await store.clear();

      expect(Result.isOk(result)).toBe(true);
      expect(mocks.deleteCollection).toHaveBeenCalledWith({
        name: 'auracore_knowledge',
      });
    });
  });
});
