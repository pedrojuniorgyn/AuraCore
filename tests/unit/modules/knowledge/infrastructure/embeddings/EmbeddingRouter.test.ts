/**
 * Testes Unitários - EmbeddingRouter
 *
 * @module tests/unit/modules/knowledge/infrastructure/embeddings
 * @see Phase D.4 - OpenAI Fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { EmbeddingRouter } from '@/modules/knowledge/infrastructure/embeddings/EmbeddingRouter';
import type { IEmbeddingService } from '@/modules/knowledge/domain/ports/output/IEmbeddingService';

// =============================================================================
// HELPER: Create Mock Service
// =============================================================================

function createMockService(
  name: string,
  dimension: number,
  embedResult: Result<number[][], string>
): IEmbeddingService {
  return {
    generateEmbeddings: vi.fn().mockResolvedValue(embedResult),
    generateEmbedding: vi.fn().mockResolvedValue(
      Result.isOk(embedResult) && embedResult.value.length > 0
        ? Result.ok(embedResult.value[0])
        : Result.fail('Erro')
    ),
    getDimension: () => dimension,
    getModelName: () => name,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('EmbeddingRouter', () => {
  let primaryOk: IEmbeddingService;
  let primaryFail: IEmbeddingService;
  let fallbackOk: IEmbeddingService;
  let fallbackFail: IEmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();

    primaryOk = createMockService('gemini', 768, Result.ok([[0.1, 0.2, 0.3]]));
    primaryFail = createMockService('gemini-fail', 768, Result.fail('Primary error'));
    fallbackOk = createMockService('openai', 1536, Result.ok([[0.4, 0.5, 0.6]]));
    fallbackFail = createMockService('openai-fail', 1536, Result.fail('Fallback error'));
  });

  // ===========================================================================
  // PRIMARY SUCCESS
  // ===========================================================================

  describe('primary success', () => {
    it('deve usar primary quando disponível', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      const result = await router.generateEmbeddings(['test']);

      expect(Result.isOk(result)).toBe(true);
      expect(primaryOk.generateEmbeddings).toHaveBeenCalledTimes(1);
    });

    it('deve retornar embeddings do primary', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      const result = await router.generateEmbeddings(['test']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value[0]).toEqual([0.1, 0.2, 0.3]);
      }
    });

    it('não deve chamar fallback se primary sucede', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk, fallback: fallbackOk });

      await router.generateEmbeddings(['test']);

      expect(fallbackOk.generateEmbeddings).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // FALLBACK
  // ===========================================================================

  describe('fallback', () => {
    it('deve usar fallback quando primary falha', async () => {
      const router = new EmbeddingRouter({
        primary: primaryFail,
        fallback: fallbackOk,
        maxRetries: 1,
      });

      const result = await router.generateEmbeddings(['test']);

      expect(Result.isOk(result)).toBe(true);
      expect(primaryFail.generateEmbeddings).toHaveBeenCalled();
      expect(fallbackOk.generateEmbeddings).toHaveBeenCalled();
    });

    it('deve retornar embeddings do fallback', async () => {
      const router = new EmbeddingRouter({
        primary: primaryFail,
        fallback: fallbackOk,
        maxRetries: 1,
      });

      const result = await router.generateEmbeddings(['test']);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value[0]).toEqual([0.4, 0.5, 0.6]);
      }
    });

    it('deve falhar se primary e fallback falham', async () => {
      const router = new EmbeddingRouter({
        primary: primaryFail,
        fallback: fallbackFail,
        maxRetries: 1,
      });

      const result = await router.generateEmbeddings(['test']);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Primary');
        expect(result.error).toContain('Fallback');
      }
    });
  });

  // ===========================================================================
  // RETRY
  // ===========================================================================

  describe('retry', () => {
    it('deve fazer retry no primary antes de usar fallback', async () => {
      const intermittentPrimary = createMockService('gemini', 768, Result.fail('Error'));
      (intermittentPrimary.generateEmbeddings as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(Result.fail('Error 1'))
        .mockResolvedValueOnce(Result.ok([[1, 2, 3]]));

      const router = new EmbeddingRouter({
        primary: intermittentPrimary,
        fallback: fallbackOk,
        maxRetries: 2,
        retryDelayMs: 1, // Delay mínimo para teste
      });

      const result = await router.generateEmbeddings(['test']);

      expect(Result.isOk(result)).toBe(true);
      expect(intermittentPrimary.generateEmbeddings).toHaveBeenCalledTimes(2);
      expect(fallbackOk.generateEmbeddings).not.toHaveBeenCalled();
    });

    it('deve esgotar retries antes de usar fallback', async () => {
      const router = new EmbeddingRouter({
        primary: primaryFail,
        fallback: fallbackOk,
        maxRetries: 3,
        retryDelayMs: 1,
      });

      await router.generateEmbeddings(['test']);

      expect(primaryFail.generateEmbeddings).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // SINGLE EMBEDDING
  // ===========================================================================

  describe('generateEmbedding', () => {
    it('deve gerar embedding único com failover', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      const result = await router.generateEmbedding('test');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toEqual([0.1, 0.2, 0.3]);
      }
    });

    it('deve falhar para texto vazio', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      const result = await router.generateEmbedding('');

      expect(Result.isFail(result)).toBe(true);
    });
  });

  // ===========================================================================
  // STATS
  // ===========================================================================

  describe('getStats', () => {
    it('deve contar sucessos do primary', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      await router.generateEmbeddings(['test1']);
      await router.generateEmbeddings(['test2']);

      const stats = router.getStats();

      expect(stats.primarySuccesses).toBe(2);
      expect(stats.fallbackSuccesses).toBe(0);
    });

    it('deve contar sucessos do fallback', async () => {
      const router = new EmbeddingRouter({
        primary: primaryFail,
        fallback: fallbackOk,
        maxRetries: 1,
      });

      await router.generateEmbeddings(['test']);

      const stats = router.getStats();

      expect(stats.primaryFailures).toBe(1);
      expect(stats.fallbackSuccesses).toBe(1);
      expect(stats.fallbackRate).toBeGreaterThan(0);
    });

    it('deve calcular successRate corretamente', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      await router.generateEmbeddings(['test']);

      const stats = router.getStats();

      expect(stats.successRate).toBe(1);
      expect(stats.totalRequests).toBe(1);
    });
  });

  // ===========================================================================
  // METADATA
  // ===========================================================================

  describe('metadata', () => {
    it('deve retornar dimension do primary', () => {
      const router = new EmbeddingRouter({ primary: primaryOk, fallback: fallbackOk });

      expect(router.getDimension()).toBe(768);
    });

    it('deve retornar model name com fallback', () => {
      const router = new EmbeddingRouter({ primary: primaryOk, fallback: fallbackOk });

      const modelName = router.getModelName();

      expect(modelName).toContain('gemini');
      expect(modelName).toContain('openai');
    });

    it('deve indicar se fallback está configurado', () => {
      const withFallback = new EmbeddingRouter({ primary: primaryOk, fallback: fallbackOk });
      const withoutFallback = new EmbeddingRouter({ primary: primaryOk });

      expect(withFallback.hasFallback()).toBe(true);
      expect(withoutFallback.hasFallback()).toBe(false);
    });

    it('deve retornar provider info', () => {
      const router = new EmbeddingRouter({ primary: primaryOk, fallback: fallbackOk });

      const info = router.getProviderInfo();

      expect(info.primary.model).toBe('gemini');
      expect(info.primary.dimension).toBe(768);
      expect(info.fallback?.model).toBe('openai');
      expect(info.fallback?.dimension).toBe(1536);
    });
  });

  // ===========================================================================
  // EMPTY INPUT
  // ===========================================================================

  describe('empty input', () => {
    it('deve retornar array vazio para input vazio', async () => {
      const router = new EmbeddingRouter({ primary: primaryOk });

      const result = await router.generateEmbeddings([]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
