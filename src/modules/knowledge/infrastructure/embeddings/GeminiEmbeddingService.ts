/**
 * GeminiEmbeddingService - Implementação do IEmbeddingService usando Google Gemini API
 *
 * @module knowledge/infrastructure/embeddings
 * @see Phase D.1 - Embedding Service Implementation
 *
 * Características:
 * - Modelo: text-embedding-004 (768 dimensões)
 * - Suporte nativo a português
 * - Batch processing até 100 textos
 * - Cache em memória com TTL
 * - TaskType diferenciado para documento vs query
 *
 * @see https://ai.google.dev/gemini-api/docs/embeddings
 */

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { Result } from '@/shared/domain';
import type { IEmbeddingService } from '../../domain/ports/output/IEmbeddingService';

// ============================================================================
// TYPES
// ============================================================================

interface GeminiEmbeddingConfig {
  /** API Key do Google AI (obrigatória) */
  apiKey: string;
  /** Modelo de embedding (default: text-embedding-004) */
  model?: string;
  /** Tamanho máximo de batch (default: 100) */
  maxBatchSize?: number;
  /** TTL do cache em segundos (default: 3600) */
  cacheTTL?: number;
}

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

interface EmbeddingStats {
  totalRequests: number;
  cacheHits: number;
  cacheSize: number;
  hitRate: string;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Embedding Service usando Google Gemini API
 *
 * FREE para Google Workspace Business com @google/generative-ai
 */
export class GeminiEmbeddingService implements IEmbeddingService {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  private readonly maxBatchSize: number;
  private readonly cacheTTL: number;
  private readonly cache: Map<string, CacheEntry>;

  // Métricas internas
  private totalRequests = 0;
  private cacheHits = 0;

  constructor(config: GeminiEmbeddingConfig) {
    if (!config.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY é obrigatório');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model ?? 'text-embedding-004';
    this.maxBatchSize = config.maxBatchSize ?? 100;
    this.cacheTTL = (config.cacheTTL ?? 3600) * 1000; // Converter para ms
    this.cache = new Map();
  }

  // ==========================================================================
  // IEmbeddingService INTERFACE
  // ==========================================================================

  /**
   * Gera embeddings para múltiplos textos (batch)
   *
   * Usa TaskType.RETRIEVAL_DOCUMENT para otimização de indexação
   */
  async generateEmbeddings(texts: string[]): Promise<Result<number[][], string>> {
    if (texts.length === 0) {
      return Result.ok([]);
    }

    try {
      this.totalRequests++;
      const results: number[][] = new Array(texts.length);
      const uncached: Array<{ index: number; text: string }> = [];

      // 1. Verificar cache para cada texto
      for (let i = 0; i < texts.length; i++) {
        const cached = this.getFromCache(texts[i]);
        if (cached) {
          results[i] = cached;
          this.cacheHits++;
        } else {
          uncached.push({ index: i, text: texts[i] });
        }
      }

      // 2. Se tudo está em cache, retornar imediatamente
      if (uncached.length === 0) {
        return Result.ok(results);
      }

      // 3. Processar textos não cacheados em batches
      const model = this.client.getGenerativeModel({ model: this.model });

      for (let i = 0; i < uncached.length; i += this.maxBatchSize) {
        const batch = uncached.slice(i, i + this.maxBatchSize);

        const response = await model.batchEmbedContents({
          requests: batch.map((item) => ({
            content: { role: 'user', parts: [{ text: item.text }] },
            taskType: TaskType.RETRIEVAL_DOCUMENT,
          })),
        });

        // 4. Processar respostas e popular cache
        for (let j = 0; j < response.embeddings.length; j++) {
          const embedding = response.embeddings[j].values;
          const item = batch[j];

          results[item.index] = embedding;
          this.setCache(item.text, embedding);
        }
      }

      return Result.ok(results);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * Gera embedding para um único texto
   *
   * Usa TaskType.RETRIEVAL_QUERY para otimização de busca
   */
  async generateEmbedding(text: string): Promise<Result<number[], string>> {
    if (!text.trim()) {
      return Result.fail('Texto não pode ser vazio');
    }

    // Verificar cache primeiro
    const cached = this.getFromCache(text);
    if (cached) {
      this.cacheHits++;
      this.totalRequests++;
      return Result.ok(cached);
    }

    try {
      this.totalRequests++;
      const model = this.client.getGenerativeModel({ model: this.model });

      const response = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_QUERY, // Otimizado para queries
      });

      const embedding = response.embedding.values;
      this.setCache(text, embedding);

      return Result.ok(embedding);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * Retorna dimensão do embedding
   *
   * text-embedding-004 = 768 dimensões
   */
  getDimension(): number {
    return 768;
  }

  /**
   * Retorna nome do modelo utilizado
   */
  getModelName(): string {
    return this.model;
  }

  // ==========================================================================
  // MÉTODOS ADICIONAIS (não na interface)
  // ==========================================================================

  /**
   * Retorna estatísticas de uso do serviço
   */
  getStats(): EmbeddingStats {
    const hitRate =
      this.totalRequests > 0
        ? ((this.cacheHits / this.totalRequests) * 100).toFixed(1) + '%'
        : '0%';

    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      cacheSize: this.cache.size,
      hitRate,
    };
  }

  /**
   * Limpa entradas expiradas do cache
   * @returns Número de entradas removidas
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Limpa todo o cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  private getFromCache(text: string): number[] | null {
    const key = this.getCacheKey(text);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Verificar se expirou
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.embedding;
  }

  private setCache(text: string, embedding: number[]): void {
    const key = this.getCacheKey(text);
    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Gera chave de cache baseada em hash do texto
   * Usa primeiros 1000 caracteres para performance
   */
  private getCacheKey(text: string): string {
    let hash = 0;
    const maxLength = Math.min(text.length, 1000);

    for (let i = 0; i < maxLength; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `gemini_${this.model}_${hash}`;
  }

  /**
   * Trata erros da API Gemini com mensagens amigáveis
   */
  private handleError(error: unknown): Result<never, string> {
    const message = error instanceof Error ? error.message : String(error);

    // Rate limiting
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return Result.fail('Rate limit Gemini excedido. Aguarde 1 minuto e tente novamente.');
    }

    // Argumento inválido
    if (message.includes('INVALID_ARGUMENT')) {
      return Result.fail('Texto inválido para embedding. Verifique o conteúdo.');
    }

    // Permissão negada / API key inválida
    if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY')) {
      return Result.fail('API key Gemini inválida ou sem permissão para embeddings.');
    }

    // Quota excedida
    if (message.includes('QUOTA_EXCEEDED')) {
      return Result.fail('Quota da API Gemini excedida. Verifique seu plano.');
    }

    // Erro genérico
    return Result.fail(`Erro ao gerar embedding: ${message}`);
  }
}
