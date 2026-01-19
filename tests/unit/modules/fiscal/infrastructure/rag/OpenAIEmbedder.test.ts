/**
 * Testes Unitários - OpenAIEmbedder
 *
 * @module tests/unit/modules/fiscal/infrastructure/rag
 * @see E-Agent-Fase-D4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { OpenAIEmbedder } from '@/modules/fiscal/infrastructure/rag/OpenAIEmbedder';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIEmbedder', () => {
  let embedder: OpenAIEmbedder;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    embedder = new OpenAIEmbedder();
  });

  // ==========================================================================
  // EMBED SINGLE
  // ==========================================================================

  describe('embed', () => {
    it('should embed single text successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: Array(1536).fill(0.1), index: 0 }],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
      });

      const result = await embedder.embed('Test text');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(1536);
      }
    });

    it('should fail if text is empty', async () => {
      const result = await embedder.embed('');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazio');
      }
    });

    it('should fail if API key is not set', async () => {
      process.env.OPENAI_API_KEY = '';
      const embedderNoKey = new OpenAIEmbedder();

      const result = await embedderNoKey.embed('Test text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('OPENAI_API_KEY');
      }
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await embedder.embed('Test text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('401');
      }
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await embedder.embed('Test text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Network error');
      }
    });
  });

  // ==========================================================================
  // EMBED BATCH
  // ==========================================================================

  describe('embedBatch', () => {
    it('should embed multiple texts successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: Array(1536).fill(0.1), index: 0 },
            { embedding: Array(1536).fill(0.2), index: 1 },
          ],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 20, total_tokens: 20 },
        }),
      });

      const result = await embedder.embedBatch(['Text 1', 'Text 2']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]).toHaveLength(1536);
        expect(result.value[1]).toHaveLength(1536);
      }
    });

    it('should fail if texts array is empty', async () => {
      const result = await embedder.embedBatch([]);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should filter empty texts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: Array(1536).fill(0.1), index: 0 }],
        }),
      });

      const result = await embedder.embedBatch(['Text 1', '', '   ']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(1);
      }
    });

    it('should sort by index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: Array(1536).fill(0.2), index: 1 },
            { embedding: Array(1536).fill(0.1), index: 0 },
          ],
        }),
      });

      const result = await embedder.embedBatch(['Text 1', 'Text 2']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // First embedding should be index 0
        expect(result.value[0][0]).toBe(0.1);
        expect(result.value[1][0]).toBe(0.2);
      }
    });
  });

  // ==========================================================================
  // GET DIMENSION
  // ==========================================================================

  describe('getDimension', () => {
    it('should return 1536 for text-embedding-3-small', () => {
      expect(embedder.getDimension()).toBe(1536);
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: Array(1536).fill(0.1), index: 0 }],
        }),
      });

      const result = await embedder.healthCheck();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('should fail if API key is not set', async () => {
      process.env.OPENAI_API_KEY = '';
      const embedderNoKey = new OpenAIEmbedder();

      const result = await embedderNoKey.healthCheck();

      expect(Result.isFail(result)).toBe(true);
    });
  });
});
