/**
 * Testes de Integração - GeminiEmbeddingService
 *
 * ATENÇÃO: Este teste requer GOOGLE_AI_API_KEY configurada.
 * Será pulado automaticamente se a variável não existir.
 *
 * Para executar:
 * GOOGLE_AI_API_KEY=xxx npm test -- --run tests/integration/knowledge/
 *
 * @module tests/integration/knowledge
 * @see Phase D.1 - Embedding Service Implementation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Result } from '@/shared/domain';
import { GeminiEmbeddingService } from '@/modules/knowledge/infrastructure/embeddings/GeminiEmbeddingService';

// Pular todos os testes se não tiver API key
const SKIP = !process.env.GOOGLE_AI_API_KEY;

describe.skipIf(SKIP)('GeminiEmbeddingService - Integration', () => {
  let service: GeminiEmbeddingService;

  beforeAll(() => {
    service = new GeminiEmbeddingService({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
    });
  });

  // ===========================================================================
  // SINGLE EMBEDDING
  // ===========================================================================

  describe('generateEmbedding', () => {
    it(
      'deve gerar embedding real para texto em português',
      async () => {
        const result = await service.generateEmbedding('Qual a alíquota de ICMS para transporte interestadual?');

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          // Verificar dimensão
          expect(result.value).toHaveLength(768);

          // Verificar que são números válidos
          expect(result.value.every((n) => typeof n === 'number' && !isNaN(n))).toBe(true);

          // Verificar range típico de embeddings (-1 a 1)
          expect(result.value.every((n) => n >= -1 && n <= 1)).toBe(true);
        }
      },
      30000
    ); // Timeout de 30s para API

    it(
      'deve gerar embeddings diferentes para textos diferentes',
      async () => {
        const result1 = await service.generateEmbedding('ICMS é um imposto estadual');
        const result2 = await service.generateEmbedding('PIS e COFINS são contribuições federais');

        expect(Result.isOk(result1)).toBe(true);
        expect(Result.isOk(result2)).toBe(true);

        if (Result.isOk(result1) && Result.isOk(result2)) {
          // Calcular similaridade (cosine similarity)
          const dotProduct = result1.value.reduce((sum, val, i) => sum + val * result2.value[i], 0);
          const norm1 = Math.sqrt(result1.value.reduce((sum, val) => sum + val * val, 0));
          const norm2 = Math.sqrt(result2.value.reduce((sum, val) => sum + val * val, 0));
          const similarity = dotProduct / (norm1 * norm2);

          // Textos diferentes devem ter similaridade menor que 0.95
          expect(similarity).toBeLessThan(0.95);
        }
      },
      30000
    );

    it(
      'deve gerar embeddings similares para textos semelhantes',
      async () => {
        const result1 = await service.generateEmbedding('Qual a alíquota de ICMS?');
        const result2 = await service.generateEmbedding('Qual é a taxa de ICMS?');

        expect(Result.isOk(result1)).toBe(true);
        expect(Result.isOk(result2)).toBe(true);

        if (Result.isOk(result1) && Result.isOk(result2)) {
          // Calcular similaridade
          const dotProduct = result1.value.reduce((sum, val, i) => sum + val * result2.value[i], 0);
          const norm1 = Math.sqrt(result1.value.reduce((sum, val) => sum + val * val, 0));
          const norm2 = Math.sqrt(result2.value.reduce((sum, val) => sum + val * val, 0));
          const similarity = dotProduct / (norm1 * norm2);

          // Textos semelhantes devem ter similaridade alta
          expect(similarity).toBeGreaterThan(0.7);
        }
      },
      30000
    );
  });

  // ===========================================================================
  // BATCH EMBEDDING
  // ===========================================================================

  describe('generateEmbeddings', () => {
    it(
      'deve gerar embeddings para múltiplos textos',
      async () => {
        const texts = [
          'Qual a alíquota de ICMS para transporte interestadual?',
          'Como calcular PIS e COFINS sobre frete?',
          'Qual o prazo de entrega do CTe?',
        ];

        const result = await service.generateEmbeddings(texts);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value).toHaveLength(3);
          result.value.forEach((embedding) => {
            expect(embedding).toHaveLength(768);
            expect(embedding.every((n) => typeof n === 'number' && !isNaN(n))).toBe(true);
          });
        }
      },
      60000
    ); // Timeout maior para batch

    it(
      'deve manter ordem dos embeddings',
      async () => {
        const texts = ['Texto A único', 'Texto B diferente', 'Texto C especial'];

        const result = await service.generateEmbeddings(texts);

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value).toHaveLength(3);

          // Cada embedding deve ser diferente (verificar primeiro valor)
          const firstValues = result.value.map((e) => e[0]);
          const unique = new Set(firstValues);
          expect(unique.size).toBe(3);
        }
      },
      60000
    );
  });

  // ===========================================================================
  // METADATA
  // ===========================================================================

  describe('metadata', () => {
    it('deve retornar dimensão correta', () => {
      expect(service.getDimension()).toBe(768);
    });

    it('deve retornar nome do modelo', () => {
      expect(service.getModelName()).toBe('embedding-004');
    });

    it('deve retornar estatísticas', async () => {
      // Fazer algumas chamadas
      await service.generateEmbedding('Teste');
      await service.generateEmbedding('Teste'); // Cache hit

      const stats = service.getStats();

      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(stats.cacheHits).toBeGreaterThanOrEqual(1);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(1);
      expect(stats.hitRate).toMatch(/\d+\.\d+%/);
    });
  });
});
