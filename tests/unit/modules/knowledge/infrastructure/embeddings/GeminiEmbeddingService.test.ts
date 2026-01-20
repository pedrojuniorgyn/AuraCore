/**
 * Testes Unitários - GeminiEmbeddingService
 *
 * @module tests/unit/modules/knowledge/infrastructure/embeddings
 * @see Phase D.1 - Embedding Service Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';

// =============================================================================
// MOCK - Usando vi.hoisted para garantir que os mocks persistam
// =============================================================================

const mocks = vi.hoisted(() => {
  return {
    embedContent: vi.fn(),
    batchEmbedContents: vi.fn(),
  };
});

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    constructor() {
      // Vazio
    }
    getGenerativeModel() {
      return {
        embedContent: mocks.embedContent,
        batchEmbedContents: mocks.batchEmbedContents,
      };
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    TaskType: {
      RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT',
      RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
    },
  };
});

import { GeminiEmbeddingService } from '@/modules/knowledge/infrastructure/embeddings/GeminiEmbeddingService';

// =============================================================================
// TESTS
// =============================================================================

describe('GeminiEmbeddingService', () => {
  beforeEach(() => {
    // Configurar mocks padrão antes de cada teste
    mocks.embedContent.mockReset();
    mocks.batchEmbedContents.mockReset();

    mocks.embedContent.mockResolvedValue({
      embedding: { values: new Array(768).fill(0.5) },
    });

    mocks.batchEmbedContents.mockResolvedValue({
      embeddings: [
        { values: new Array(768).fill(0.1) },
        { values: new Array(768).fill(0.2) },
      ],
    });
  });

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  describe('constructor', () => {
    it('deve lançar erro se apiKey não fornecida', () => {
      expect(() => new GeminiEmbeddingService({ apiKey: '' })).toThrow(
        'GOOGLE_AI_API_KEY é obrigatório'
      );
    });

    it('deve usar valores padrão quando não especificados', () => {
      const svc = new GeminiEmbeddingService({ apiKey: 'test-key' });
      expect(svc.getDimension()).toBe(768);
      expect(svc.getModelName()).toBe('text-embedding-004');
    });

    it('deve aceitar modelo customizado', () => {
      const svc = new GeminiEmbeddingService({
        apiKey: 'test-key',
        model: 'custom-model',
      });
      expect(svc.getModelName()).toBe('custom-model');
    });
  });

  // ===========================================================================
  // METADATA
  // ===========================================================================

  describe('getDimension', () => {
    it('deve retornar 768 (text-embedding-004)', () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      expect(service.getDimension()).toBe(768);
    });
  });

  describe('getModelName', () => {
    it('deve retornar nome do modelo padrão', () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      expect(service.getModelName()).toBe('text-embedding-004');
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas iniciais zeradas', () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const stats = service.getStats();

      expect(stats).toEqual({
        totalRequests: 0,
        cacheHits: 0,
        cacheSize: 0,
        hitRate: '0%',
      });
    });
  });

  // ===========================================================================
  // INPUT VALIDATION
  // ===========================================================================

  describe('generateEmbedding - validação de input', () => {
    it('deve falhar para texto vazio', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazio');
      }
    });

    it('deve falhar para texto apenas com espaços', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('   ');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('vazio');
      }
    });
  });

  describe('generateEmbeddings - validação de input', () => {
    it('deve retornar array vazio para input vazio', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbeddings([]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  // ===========================================================================
  // API CALLS
  // ===========================================================================

  describe('API calls', () => {
    it('deve gerar embedding para texto válido', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('Texto válido');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(768);
        expect(mocks.embedContent).toHaveBeenCalled();
      }
    });

    it('deve gerar embeddings para múltiplos textos', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbeddings(['Texto 1', 'Texto 2']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(mocks.batchEmbedContents).toHaveBeenCalled();
      }
    });

    it('deve chamar embedContent com TaskType RETRIEVAL_QUERY', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      await service.generateEmbedding('Query');

      expect(mocks.embedContent).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'RETRIEVAL_QUERY',
        })
      );
    });

    it('deve chamar batchEmbedContents com TaskType RETRIEVAL_DOCUMENT', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      await service.generateEmbeddings(['Doc']);

      expect(mocks.batchEmbedContents).toHaveBeenCalledWith(
        expect.objectContaining({
          requests: expect.arrayContaining([
            expect.objectContaining({
              taskType: 'RETRIEVAL_DOCUMENT',
            }),
          ]),
        })
      );
    });
  });

  // ===========================================================================
  // CACHE
  // ===========================================================================

  describe('cache behavior', () => {
    it('deve usar cache para textos repetidos', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });

      await service.generateEmbedding('Texto cache');
      expect(service.getStats().cacheSize).toBe(1);
      expect(mocks.embedContent).toHaveBeenCalledTimes(1);

      await service.generateEmbedding('Texto cache');
      expect(service.getStats().cacheHits).toBe(1);
      // Não deve chamar API novamente
      expect(mocks.embedContent).toHaveBeenCalledTimes(1);
    });

    it('deve calcular hit rate corretamente', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });

      await service.generateEmbedding('Text');
      await service.generateEmbedding('Text');

      const stats = service.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.hitRate).toBe('50.0%');
    });

    it('deve limpar cache com clearCache', async () => {
      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });

      await service.generateEmbedding('T1');
      expect(service.getStats().cacheSize).toBe(1);

      service.clearCache();
      expect(service.getStats().cacheSize).toBe(0);
    });

    it('deve limpar entradas expiradas', async () => {
      const service = new GeminiEmbeddingService({
        apiKey: 'test-key',
        cacheTTL: 0,
      });

      await service.generateEmbedding('Expirable');
      await new Promise((r) => setTimeout(r, 10));

      const cleaned = service.cleanExpiredCache();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('error handling', () => {
    it('deve tratar erro de rate limit', async () => {
      mocks.embedContent.mockRejectedValueOnce(new Error('RESOURCE_EXHAUSTED'));

      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('Text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Rate limit');
      }
    });

    it('deve tratar erro de API key inválida', async () => {
      mocks.embedContent.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('Text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('API key Gemini');
      }
    });

    it('deve tratar erro de quota', async () => {
      mocks.embedContent.mockRejectedValueOnce(new Error('QUOTA_EXCEEDED'));

      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('Text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Quota');
      }
    });

    it('deve tratar erro genérico', async () => {
      mocks.embedContent.mockRejectedValueOnce(new Error('Generic error'));

      const service = new GeminiEmbeddingService({ apiKey: 'test-key' });
      const result = await service.generateEmbedding('Text');

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Generic error');
      }
    });
  });
});
