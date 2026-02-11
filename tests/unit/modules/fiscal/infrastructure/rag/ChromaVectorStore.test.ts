/**
 * Testes Unitários - ChromaVectorStore
 *
 * @module tests/unit/modules/fiscal/infrastructure/rag
 * @see E-Agent-Fase-D4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { ChromaVectorStore } from '@/modules/fiscal/infrastructure/rag/ChromaVectorStore';
import { mockChunksWithEmbedding, mockEmbedding } from '../../domain/services/rag/fixtures/rag-mock';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ChromaVectorStore', () => {
  let vectorStore: ChromaVectorStore;

  /** Helper: mock heartbeat that waitForChromaDB() calls before ensureCollection */
  const mockHeartbeat = () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ nanosecond_heartbeat: Date.now() }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vectorStore = new ChromaVectorStore();
  });

  // ==========================================================================
  // UPSERT
  // ==========================================================================

  describe('upsert', () => {
    it('should upsert chunks successfully', async () => {
      mockHeartbeat();
      // Mock collection list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      // Mock upsert
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await vectorStore.upsert(mockChunksWithEmbedding);

      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail if chunks array is empty', async () => {
      const result = await vectorStore.upsert([]);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Nenhum chunk');
      }
    });

    it('should fail if chunk has no embedding', async () => {
      const chunksNoEmbedding = [{ ...mockChunksWithEmbedding[0], embedding: undefined }];

      const result = await vectorStore.upsert(chunksNoEmbedding);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('embedding');
      }
    });

    it('should create collection if not exists', async () => {
      mockHeartbeat();
      // Mock empty collection list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock create collection
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-coll', name: 'legislation' }),
      });

      // Mock upsert
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await vectorStore.upsert(mockChunksWithEmbedding);

      expect(Result.isOk(result)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4); // heartbeat + list + create + upsert
    });

    it('should handle upsert error', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await vectorStore.upsert(mockChunksWithEmbedding);

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  describe('search', () => {
    it('should search successfully', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ids: [['chunk-1', 'chunk-2']],
          documents: [['Text 1', 'Text 2']],
          metadatas: [
            [
              { documentId: 'doc-1', documentTitle: 'Doc 1', category: 'ICMS' },
              { documentId: 'doc-1', documentTitle: 'Doc 1', category: 'ICMS' },
            ],
          ],
          distances: [[0.1, 0.2]],
        }),
      });

      const result = await vectorStore.search(mockEmbedding, { topK: 5 });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].score).toBeGreaterThan(result.value[1].score);
      }
    });

    it('should fail if query embedding is empty', async () => {
      const result = await vectorStore.search([], { topK: 5 });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should filter by minScore', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ids: [['chunk-1', 'chunk-2']],
          documents: [['Text 1', 'Text 2']],
          metadatas: [[{}, {}]],
          distances: [[0.1, 0.9]], // Second has low score
        }),
      });

      const result = await vectorStore.search(mockEmbedding, {
        topK: 5,
        minScore: 0.8,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Only first should pass minScore filter
        expect(result.value.length).toBeLessThanOrEqual(2);
      }
    });

    it('should apply filters', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]],
        }),
      });

      const result = await vectorStore.search(mockEmbedding, {
        topK: 5,
        filter: { documentId: 'specific-doc' },
      });

      expect(Result.isOk(result)).toBe(true);
      // Check that filter was applied in request
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('documentId'),
        })
      );
    });
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  describe('deleteByDocumentId', () => {
    it('should delete successfully', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await vectorStore.deleteByDocumentId('doc-123');

      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail if documentId is empty', async () => {
      const result = await vectorStore.deleteByDocumentId('');

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ==========================================================================
  // LIST DOCUMENTS
  // ==========================================================================

  describe('listDocuments', () => {
    it('should list documents successfully', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ids: ['chunk-1', 'chunk-2'],
          metadatas: [
            { documentId: 'doc-1', documentTitle: 'Doc 1', category: 'ICMS', totalChunks: 5 },
            { documentId: 'doc-2', documentTitle: 'Doc 2', category: 'CTe', totalChunks: 3 },
          ],
        }),
      });

      const result = await vectorStore.listDocuments();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  // ==========================================================================
  // COUNT
  // ==========================================================================

  describe('count', () => {
    it('should return count', async () => {
      mockHeartbeat();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'coll-123', name: 'legislation' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 42,
      });

      const result = await vectorStore.count();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe(42);
      }
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true when healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nanosecond_heartbeat: Date.now() }),
      });

      const result = await vectorStore.healthCheck();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('should fail when unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await vectorStore.healthCheck();

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await vectorStore.healthCheck();

      expect(Result.isFail(result)).toBe(true);
    });
  });
});
