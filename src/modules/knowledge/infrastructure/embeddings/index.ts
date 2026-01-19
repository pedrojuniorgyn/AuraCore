/**
 * Embeddings Infrastructure - Barrel Export
 *
 * @module knowledge/infrastructure/embeddings
 */

import { GeminiEmbeddingService } from './GeminiEmbeddingService';

export { GeminiEmbeddingService };
export type { IEmbeddingService } from '../../domain/ports/output/IEmbeddingService';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Cria instância do EmbeddingService com configuração do ambiente
 *
 * @throws Error se GOOGLE_AI_API_KEY não estiver configurada
 *
 * @example
 * ```typescript
 * const embeddingService = createEmbeddingService();
 * const result = await embeddingService.generateEmbedding('Qual a alíquota de ICMS?');
 * ```
 */
export function createEmbeddingService(): GeminiEmbeddingService {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GOOGLE_AI_API_KEY não configurada no ambiente. ' +
        'Configure a variável no .env.local ou nas variáveis de ambiente do Coolify.'
    );
  }

  return new GeminiEmbeddingService({
    apiKey,
    model: process.env.GEMINI_EMBEDDING_MODEL ?? 'embedding-004',
    maxBatchSize: parseInt(process.env.GEMINI_BATCH_SIZE ?? '100', 10),
    cacheTTL: parseInt(process.env.GEMINI_CACHE_TTL ?? '3600', 10),
  });
}

/**
 * Verifica se o serviço de embedding está configurado
 */
export function isEmbeddingServiceConfigured(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}
