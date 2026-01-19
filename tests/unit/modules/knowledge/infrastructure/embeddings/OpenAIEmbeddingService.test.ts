/**
 * Testes Unitários - OpenAIEmbeddingService
 *
 * @module tests/unit/modules/knowledge/infrastructure/embeddings
 * @see Phase D.4 - OpenAI Fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';

// =============================================================================
// MOCKS
// =============================================================================

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('openai', () => {
  class MockOpenAI {
    embeddings = {
      create: mocks.create,
    };

    constructor() {
      // Vazio
    }
  }

  return {
    default: MockOpenAI,
  };
});

import { OpenAIEmbeddingService } from '@/modules/knowledge/infrastructure/embeddings/OpenAIEmbeddingService';

// =============================================================================
// TESTS
// =============================================================================

describe('OpenAIEmbeddingService', () => {
  let service: OpenAIEmbeddingService;

  beforeEach(() => {
    mocks.create.mockReset();

    // Mock padrão
    mocks.create.mockResolvedValue({
      data: [{ index: 0, embedding: new Array(1536).fill(0.1) }],
      usage: { total_tokens: 10 },
    });

    service = new OpenAIEmbeddingService({
      apiKey: 'test-api-key',
    });
  });

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  describe('constructor', () => {
    it('deve lançar erro se apiKey não fornecida', () => {
      expect(() => new OpenAIEmbeddingService({ apiKey: '' })).toThrow(
        'OPENAI_API_KEY é obrigatório'
      );
    });

    it('deve usar modelo padrão text-embedding-3-small', () => {
      const s = new OpenAIEmbeddingService({ apiKey: 'test' });
      expect(s.getModelName()).toBe('text-embedding-3-small');
    });

    it('deve aceitar modelo customizado', () => {
      const s = new OpenAIEmbeddingService({
        apiKey: 'test',
        model: 'text-embedding-ada-002',
      });
      expect(s.getModelName()).toBe('text-embedding-ada-002');
    });
  });

  // ===========================================================================
  // DIMENSION
  // ===========================================================================

  describe('getDimension', () => {
    it('deve retornar 1536 para modelos padrão', () => {
      expect(service.getDimension()).toBe(1536);
    });

    it('deve retornar 3072 para text-embedding-3-large', () => {
      const s = new OpenAIEmbeddingService({
        apiKey: 'test',
        model: 'text-embedding-3-large',
      });
      expect(s.getDimension()).toBe(3072);
    });
  });

  // ===========================================================================
  // generateEmbeddings
  // ===========================================================================

  describe('generateEmbeddings', () => {
    it('deve gerar embeddings para múltiplos textos', async () => {
      mocks.create.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: new Array(1536).fill(0.1) },
          { index: 1, embedding: new Array(1536).fill(0.2) },
        ],
        usage: { total_tokens: 20 },
      });

      const result = await service.generateEmbeddings(['Texto 1', 'Texto 2']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]).toHaveLength(1536);
      }
    });

    it('deve retornar array vazio para input vazio', async () => {
      const result = await service.generateEmbeddings([]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(0);
      }
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it('deve processar em batches para mais de maxBatchSize textos', async () => {
      // Serviço com batch pequeno
      const smallBatchService = new OpenAIEmbeddingService({
        apiKey: 'test',
        maxBatchSize: 2,
      });

      mocks.create
        .mockResolvedValueOnce({
          data: [
            { index: 0, embedding: new Array(1536).fill(0.1) },
            { index: 1, embedding: new Array(1536).fill(0.2) },
          ],
          usage: { total_tokens: 10 },
        })
        .mockResolvedValueOnce({
          data: [{ index: 0, embedding: new Array(1536).fill(0.3) }],
          usage: { total_tokens: 5 },
        });

      const result = await smallBatchService.generateEmbeddings(['T1', 'T2', 'T3']);

      expect(Result.isOk(result)).toBe(true);
      expect(mocks.create).toHaveBeenCalledTimes(2);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(3);
      }
    });

    it('deve tratar erro de rate limit', async () => {
      mocks.create.mockRejectedValueOnce(new Error('rate_limit exceeded'));

      const result = await service.generateEmbeddings(['teste']);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Rate limit');
      }
    });

    it('deve tratar erro de quota', async () => {
      mocks.create.mockRejectedValueOnce(new Error('insufficient_quota'));

      const result = await service.generateEmbeddings(['teste']);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Quota');
      }
    });

    it('deve tratar erro de API key inválida', async () => {
      mocks.create.mockRejectedValueOnce(new Error('invalid_api_key'));

      const result = await service.generateEmbeddings(['teste']);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('API key');
      }
    });
  });

  // ===========================================================================
  // generateEmbedding
  // ===========================================================================

  describe('generateEmbedding', () => {
    it('deve gerar embedding para texto único', async () => {
      const result = await service.generateEmbedding('Texto de teste');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(1536);
      }
    });

    it('deve falhar para texto vazio', async () => {
      const result = await service.generateEmbedding('');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazio');
      }
    });

    it('deve falhar para texto só com espaços', async () => {
      const result = await service.generateEmbedding('   ');

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ===========================================================================
  // getStats
  // ===========================================================================

  describe('getStats', () => {
    it('deve retornar estatísticas de uso', async () => {
      await service.generateEmbedding('teste');

      const stats = service.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.totalTokens).toBe(10);
      expect(stats.model).toBe('text-embedding-3-small');
      expect(stats.dimension).toBe(1536);
    });
  });
});
