/**
 * Embeddings Infrastructure - Barrel Export
 *
 * @module knowledge/infrastructure/embeddings
 */

import { GeminiEmbeddingService } from './GeminiEmbeddingService';
import { OpenAIEmbeddingService } from './OpenAIEmbeddingService';
import { EmbeddingRouter } from './EmbeddingRouter';
import type { IEmbeddingService } from '../../domain/ports/output/IEmbeddingService';

export { GeminiEmbeddingService };
export { OpenAIEmbeddingService };
export { EmbeddingRouter };
export type { IEmbeddingService };

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

type EmbeddingProvider = 'gemini' | 'openai' | 'auto';

interface CreateEmbeddingServiceOptions {
  /** Provider primário (default: auto) */
  provider?: EmbeddingProvider;
  /** Habilitar fallback (default: true se OPENAI_API_KEY disponível) */
  enableFallback?: boolean;
}

/**
 * Cria instância do EmbeddingService com configuração do ambiente
 *
 * @param options - Opções de configuração
 * @throws Error se nenhuma API key estiver configurada
 *
 * @example
 * ```typescript
 * // Auto-detecta e configura fallback
 * const service = createEmbeddingService();
 *
 * // Forçar provider específico
 * const gemini = createEmbeddingService({ provider: 'gemini' });
 * const openai = createEmbeddingService({ provider: 'openai' });
 *
 * // Desabilitar fallback
 * const noFallback = createEmbeddingService({ enableFallback: false });
 * ```
 */
export function createEmbeddingService(
  options: CreateEmbeddingServiceOptions = {}
): IEmbeddingService {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const provider = options.provider ?? 'auto';
  const enableFallback = options.enableFallback ?? process.env.EMBEDDING_FALLBACK_ENABLED === 'true';

  // Validar que ao menos uma key existe
  if (!geminiKey && !openaiKey) {
    throw new Error(
      'Nenhuma API key de embedding configurada. ' +
        'Configure GOOGLE_AI_API_KEY ou OPENAI_API_KEY no .env.local'
    );
  }

  // Criar services disponíveis
  const gemini = geminiKey
    ? new GeminiEmbeddingService({
        apiKey: geminiKey,
        model: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
        maxBatchSize: parseInt(process.env.GEMINI_BATCH_SIZE ?? '100', 10),
        cacheTTL: parseInt(process.env.GEMINI_CACHE_TTL ?? '3600', 10),
      })
    : null;

  const openai = openaiKey
    ? new OpenAIEmbeddingService({
        apiKey: openaiKey,
        model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
        maxBatchSize: parseInt(process.env.OPENAI_EMBEDDING_BATCH_SIZE ?? '100', 10),
      })
    : null;

  // Escolher provider baseado na opção
  if (provider === 'gemini') {
    if (!gemini) throw new Error('GOOGLE_AI_API_KEY não configurada');
    return gemini;
  }

  if (provider === 'openai') {
    if (!openai) throw new Error('OPENAI_API_KEY não configurada');
    return openai;
  }

  // Auto: usar Gemini como primary se disponível, senão OpenAI
  const primary = gemini ?? openai!;
  const fallback = gemini && openai && enableFallback ? openai : undefined;

  // Se fallback disponível, usar router
  if (fallback) {
    return new EmbeddingRouter({
      primary,
      fallback,
      maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES ?? '2', 10),
      retryDelayMs: parseInt(process.env.EMBEDDING_RETRY_DELAY_MS ?? '1000', 10),
    });
  }

  return primary;
}

/**
 * Verifica se o serviço de embedding está configurado
 */
export function isEmbeddingServiceConfigured(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Verifica configuração de embedding disponível
 */
export function getEmbeddingConfiguration(): {
  geminiConfigured: boolean;
  openaiConfigured: boolean;
  fallbackEnabled: boolean;
  primaryProvider: 'gemini' | 'openai' | 'none';
} {
  const geminiConfigured = Boolean(process.env.GOOGLE_AI_API_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const fallbackEnabled =
    process.env.EMBEDDING_FALLBACK_ENABLED === 'true' && geminiConfigured && openaiConfigured;

  let primaryProvider: 'gemini' | 'openai' | 'none' = 'none';
  if (geminiConfigured) {
    primaryProvider = 'gemini';
  } else if (openaiConfigured) {
    primaryProvider = 'openai';
  }

  return {
    geminiConfigured,
    openaiConfigured,
    fallbackEnabled,
    primaryProvider,
  };
}
