/**
 * Testes Unitários - LegislationRAG
 *
 * @module tests/unit/modules/fiscal/application/services
 * @see E-Agent-Fase-D4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import type { IEmbedder } from '@/modules/fiscal/domain/ports/output/IEmbedder';
import type { IVectorStore } from '@/modules/fiscal/domain/ports/output/IVectorStore';
import type { IAnswerGenerator } from '@/modules/fiscal/domain/ports/output/IAnswerGenerator';
import {
  mockChunks,
  mockChunksWithEmbedding,
  mockEmbedding,
  mockSearchResults,
  mockRAGResponse,
  mockIndexedDocuments,
} from '../../domain/services/rag/fixtures/rag-mock';

// Mock implementations
const createMockEmbedder = (): IEmbedder => ({
  embed: vi.fn().mockResolvedValue(Result.ok(mockEmbedding)),
  embedBatch: vi.fn().mockResolvedValue(Result.ok([mockEmbedding, mockEmbedding])),
  getDimension: vi.fn().mockReturnValue(1536),
  healthCheck: vi.fn().mockResolvedValue(Result.ok(true)),
});

const createMockVectorStore = (): IVectorStore => ({
  upsert: vi.fn().mockResolvedValue(Result.ok(undefined)),
  search: vi.fn().mockResolvedValue(Result.ok(mockSearchResults)),
  deleteByDocumentId: vi.fn().mockResolvedValue(Result.ok(undefined)),
  listDocuments: vi.fn().mockResolvedValue(Result.ok(mockIndexedDocuments)),
  count: vi.fn().mockResolvedValue(Result.ok(10)),
  healthCheck: vi.fn().mockResolvedValue(Result.ok(true)),
});

const createMockAnswerGenerator = (): IAnswerGenerator => ({
  generate: vi.fn().mockResolvedValue(Result.ok(mockRAGResponse)),
  healthCheck: vi.fn().mockResolvedValue(Result.ok(true)),
});

describe('LegislationRAG', () => {
  let embedder: IEmbedder;
  let vectorStore: IVectorStore;
  let answerGenerator: IAnswerGenerator;
  let rag: LegislationRAG;

  beforeEach(() => {
    embedder = createMockEmbedder();
    vectorStore = createMockVectorStore();
    answerGenerator = createMockAnswerGenerator();
    rag = new LegislationRAG(embedder, vectorStore, answerGenerator);
  });

  // ==========================================================================
  // INDEX CHUNKS
  // ==========================================================================

  describe('indexChunks', () => {
    it('should index chunks successfully', async () => {
      const result = await rag.indexChunks(mockChunks);

      expect(Result.isOk(result)).toBe(true);
      expect(embedder.embedBatch).toHaveBeenCalledWith(
        mockChunks.map((c) => c.content)
      );
      expect(vectorStore.upsert).toHaveBeenCalled();
    });

    it('should fail if chunks array is empty', async () => {
      const result = await rag.indexChunks([]);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('chunk');
      }
    });

    it('should fail if embedding fails', async () => {
      (embedder.embedBatch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.fail('Embedding error')
      );

      const result = await rag.indexChunks(mockChunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Embedding error');
      }
    });

    it('should fail if upsert fails', async () => {
      (vectorStore.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.fail('Upsert error')
      );

      const result = await rag.indexChunks(mockChunks);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Upsert error');
      }
    });

    it('should add embeddings to chunks before upsert', async () => {
      await rag.indexChunks(mockChunks);

      const upsertCall = (vectorStore.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
      const chunksWithEmbeddings = upsertCall[0];

      expect(chunksWithEmbeddings[0].embedding).toBeDefined();
      expect(chunksWithEmbeddings[0].embedding).toHaveLength(1536);
    });
  });

  // ==========================================================================
  // QUERY
  // ==========================================================================

  describe('query', () => {
    it('should query and return response', async () => {
      const result = await rag.query('Qual a alíquota de ICMS?');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.answer).toBeDefined();
        expect(result.value.citations).toBeDefined();
      }
    });

    it('should fail if question is empty', async () => {
      const result = await rag.query('');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazia');
      }
    });

    it('should embed the question', async () => {
      await rag.query('Test question');

      expect(embedder.embed).toHaveBeenCalledWith('Test question');
    });

    it('should search with embedded question', async () => {
      await rag.query('Test question');

      expect(vectorStore.search).toHaveBeenCalledWith(
        mockEmbedding,
        expect.any(Object)
      );
    });

    it('should fail if embedding fails', async () => {
      (embedder.embed as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.fail('Embed error')
      );

      const result = await rag.query('Test question');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail if search fails', async () => {
      (vectorStore.search as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.fail('Search error')
      );

      const result = await rag.query('Test question');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should return "no results" if no chunks found', async () => {
      (vectorStore.search as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.ok([])
      );

      const result = await rag.query('Test question');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.answer).toContain('encontr');
        expect(result.value.citations).toHaveLength(0);
      }
    });

    it('should pass context to answer generator', async () => {
      await rag.query('Test question');

      expect(answerGenerator.generate).toHaveBeenCalledWith(
        'Test question',
        expect.any(Array),
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // DELETE DOCUMENT
  // ==========================================================================

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      const result = await rag.deleteDocument('doc-123');

      expect(Result.isOk(result)).toBe(true);
      expect(vectorStore.deleteByDocumentId).toHaveBeenCalledWith('doc-123');
    });

    it('should fail if documentId is empty', async () => {
      const result = await rag.deleteDocument('');

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ==========================================================================
  // LIST DOCUMENTS
  // ==========================================================================

  describe('listDocuments', () => {
    it('should list documents successfully', async () => {
      const result = await rag.listDocuments();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // listDocuments retorna formato simplificado { id, title, chunksCount }
        expect(result.value).toHaveLength(mockIndexedDocuments.length);
        expect(result.value[0]).toHaveProperty('id');
        expect(result.value[0]).toHaveProperty('title');
        expect(result.value[0]).toHaveProperty('chunksCount');
      }
    });
  });

  // ==========================================================================
  // SEARCH ONLY
  // ==========================================================================

  describe('searchOnly', () => {
    it('should search without generating answer', async () => {
      const result = await rag.searchOnly('Test query');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toEqual(mockSearchResults);
      }
      expect(answerGenerator.generate).not.toHaveBeenCalled();
    });

    it('should fail if query is empty', async () => {
      const result = await rag.searchOnly('');

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return all healthy', async () => {
      const result = await rag.healthCheck();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.embedder).toBe(true);
        expect(result.value.vectorStore).toBe(true);
        expect(result.value.answerGenerator).toBe(true);
      }
    });

    it('should report unhealthy embedder', async () => {
      (embedder.healthCheck as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.fail('Embedder down')
      );

      const result = await rag.healthCheck();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.embedder).toBe(false);
      }
    });

    it('should report unhealthy vector store', async () => {
      (vectorStore.healthCheck as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        Result.fail('VectorStore down')
      );

      const result = await rag.healthCheck();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.vectorStore).toBe(false);
      }
    });
  });
});
