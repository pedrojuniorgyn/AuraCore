/**
 * OpenAIEmbeddingService - Infrastructure Implementation
 *
 * Implementação de embedding service usando OpenAI API.
 * Usado como fallback para alta disponibilidade.
 *
 * @module knowledge/infrastructure/embeddings
 * @see Phase D.4 - OpenAI Fallback
 *
 * Características:
 * - Modelo: text-embedding-3-small (1536 dimensões)
 * - Batch processing até 100 textos
 * - Alta confiabilidade
 *
 * @see https://platform.openai.com/docs/guides/embeddings
 */

import OpenAI from 'openai';
import { Result } from '@/shared/domain';
import type { IEmbeddingService } from '../../domain/ports/output/IEmbeddingService';

// ============================================================================
// TYPES
// ============================================================================

interface OpenAIEmbeddingConfig {
  /** API Key da OpenAI */
  apiKey: string;
  /** Modelo de embedding (default: text-embedding-3-small) */
  model?: string;
  /** Tamanho máximo do batch (default: 100) */
  maxBatchSize?: number;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Embedding Service usando OpenAI API
 *
 * Modelos disponíveis:
 * - text-embedding-3-small: 1536 dimensões, mais rápido
 * - text-embedding-3-large: 3072 dimensões, mais preciso
 * - text-embedding-ada-002: 1536 dimensões, modelo anterior
 */
export class OpenAIEmbeddingService implements IEmbeddingService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxBatchSize: number;
  private readonly dimension: number;

  // Métricas
  private totalRequests = 0;
  private totalTokens = 0;

  constructor(config: OpenAIEmbeddingConfig) {
    if (!config.apiKey) {
      throw new Error('OPENAI_API_KEY é obrigatório');
    }

    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'text-embedding-3-small';
    this.maxBatchSize = config.maxBatchSize ?? 100;

    // Dimensão baseada no modelo
    this.dimension = this.model.includes('3-large') ? 3072 : 1536;
  }

  // ==========================================================================
  // IEmbeddingService INTERFACE
  // ==========================================================================

  /**
   * Gera embeddings para múltiplos textos
   */
  async generateEmbeddings(texts: string[]): Promise<Result<number[][], string>> {
    if (texts.length === 0) {
      return Result.ok([]);
    }

    try {
      this.totalRequests++;
      const results: number[][] = new Array(texts.length);

      // Processar em batches
      for (let i = 0; i < texts.length; i += this.maxBatchSize) {
        const batch = texts.slice(i, i + this.maxBatchSize);

        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        // Registrar tokens usados
        if (response.usage) {
          this.totalTokens += response.usage.total_tokens;
        }

        // Mapear resultados na ordem correta
        for (const item of response.data) {
          results[i + item.index] = item.embedding;
        }
      }

      return Result.ok(results);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * Gera embedding para um único texto
   */
  async generateEmbedding(text: string): Promise<Result<number[], string>> {
    if (!text || text.trim().length === 0) {
      return Result.fail('Texto não pode ser vazio');
    }

    try {
      this.totalRequests++;

      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      if (response.usage) {
        this.totalTokens += response.usage.total_tokens;
      }

      return Result.ok(response.data[0].embedding);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * Retorna dimensão do embedding
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Retorna nome do modelo
   */
  getModelName(): string {
    return this.model;
  }

  // ==========================================================================
  // MÉTODOS ADICIONAIS
  // ==========================================================================

  /**
   * Retorna estatísticas de uso
   */
  getStats(): {
    totalRequests: number;
    totalTokens: number;
    model: string;
    dimension: number;
  } {
    return {
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      model: this.model,
      dimension: this.dimension,
    };
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  /**
   * Tratamento de erros com mensagens amigáveis
   */
  private handleError(error: unknown): Result<never, string> {
    const message = error instanceof Error ? error.message : String(error);

    // Rate limit
    if (message.includes('rate_limit') || message.includes('429')) {
      return Result.fail('Rate limit OpenAI excedido. Aguarde e tente novamente.');
    }

    // Quota
    if (message.includes('insufficient_quota')) {
      return Result.fail('Quota OpenAI excedida. Verifique seu billing.');
    }

    // API Key inválida
    if (message.includes('invalid_api_key') || message.includes('401')) {
      return Result.fail('API key OpenAI inválida.');
    }

    // Texto muito longo
    if (message.includes('maximum context length')) {
      return Result.fail('Texto muito longo para embedding.');
    }

    return Result.fail(`Erro OpenAI: ${message}`);
  }
}
