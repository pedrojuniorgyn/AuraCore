/**
 * EmbeddingRouter - Infrastructure Implementation
 *
 * Router com fallback automático entre providers de embedding.
 * Garante alta disponibilidade usando múltiplos serviços.
 *
 * @module knowledge/infrastructure/embeddings
 * @see Phase D.4 - OpenAI Fallback
 *
 * Características:
 * - Retry com backoff exponencial
 * - Fallback automático para segundo provider
 * - Métricas de uso
 * - Logging de falhas
 */

import { Result } from '@/shared/domain';
import type { IEmbeddingService } from '../../domain/ports/output/IEmbeddingService';

import { logger } from '@/shared/infrastructure/logging';
// ============================================================================
// TYPES
// ============================================================================

interface EmbeddingRouterConfig {
  /** Provider primário (preferido) */
  primary: IEmbeddingService;
  /** Provider de fallback (opcional) */
  fallback?: IEmbeddingService;
  /** Número máximo de retries no primary antes de fallback (default: 2) */
  maxRetries?: number;
  /** Delay base em ms entre retries (default: 1000) */
  retryDelayMs?: number;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Router com failover automático entre providers de embedding
 *
 * Fluxo:
 * 1. Tenta primary com retries
 * 2. Se falhar, usa fallback (se configurado)
 * 3. Se ambos falharem, retorna erro
 */
export class EmbeddingRouter implements IEmbeddingService {
  private readonly primary: IEmbeddingService;
  private readonly fallback?: IEmbeddingService;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  // Métricas
  private primarySuccesses = 0;
  private primaryFailures = 0;
  private fallbackSuccesses = 0;
  private fallbackFailures = 0;

  constructor(config: EmbeddingRouterConfig) {
    this.primary = config.primary;
    this.fallback = config.fallback;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
  }

  // ==========================================================================
  // IEmbeddingService INTERFACE
  // ==========================================================================

  /**
   * Gera embeddings para múltiplos textos com failover
   */
  async generateEmbeddings(texts: string[]): Promise<Result<number[][], string>> {
    if (texts.length === 0) {
      return Result.ok([]);
    }

    // 1. Tentar primary com retries
    let lastError = '';

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const result = await this.primary.generateEmbeddings(texts);

      if (Result.isOk(result)) {
        this.primarySuccesses++;
        return result;
      }

      lastError = result.error;

      // Log do erro
      logger.warn(`[EmbeddingRouter] Primary attempt ${attempt + 1}/${this.maxRetries} failed: ${lastError}`);

      // Aguardar antes de retry (backoff exponencial)
      if (attempt < this.maxRetries - 1) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt));
      }
    }

    this.primaryFailures++;

    // 2. Tentar fallback se disponível
    if (this.fallback) {
      logger.warn('[EmbeddingRouter] Primary esgotou retries, usando fallback');

      const fallbackResult = await this.fallback.generateEmbeddings(texts);

      if (Result.isOk(fallbackResult)) {
        this.fallbackSuccesses++;
        return fallbackResult;
      }

      this.fallbackFailures++;
      logger.error('[EmbeddingRouter] Fallback também falhou:', fallbackResult.error);

      return Result.fail(
        `Todos os providers falharam. Primary: ${lastError}. Fallback: ${fallbackResult.error}`
      );
    }

    // 3. Sem fallback disponível
    return Result.fail(`Primary falhou após ${this.maxRetries} tentativas: ${lastError}`);
  }

  /**
   * Gera embedding para um único texto com failover
   */
  async generateEmbedding(text: string): Promise<Result<number[], string>> {
    if (!text || text.trim().length === 0) {
      return Result.fail('Texto não pode ser vazio');
    }

    // Usar generateEmbeddings para aproveitar lógica de retry
    const result = await this.generateEmbeddings([text]);

    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    return Result.ok(result.value[0]);
  }

  /**
   * Retorna dimensão do embedding do primary
   */
  getDimension(): number {
    return this.primary.getDimension();
  }

  /**
   * Retorna nome do modelo do primary
   */
  getModelName(): string {
    const primaryName = this.primary.getModelName();
    const fallbackName = this.fallback?.getModelName();

    return fallbackName ? `${primaryName} (fallback: ${fallbackName})` : primaryName;
  }

  // ==========================================================================
  // MÉTODOS ADICIONAIS
  // ==========================================================================

  /**
   * Retorna estatísticas de uso
   */
  getStats(): {
    primarySuccesses: number;
    primaryFailures: number;
    fallbackSuccesses: number;
    fallbackFailures: number;
    fallbackRate: number;
    totalRequests: number;
    successRate: number;
  } {
    const totalSuccesses = this.primarySuccesses + this.fallbackSuccesses;
    const totalFailures = this.primaryFailures + this.fallbackFailures;
    const totalRequests = totalSuccesses + totalFailures;

    return {
      primarySuccesses: this.primarySuccesses,
      primaryFailures: this.primaryFailures,
      fallbackSuccesses: this.fallbackSuccesses,
      fallbackFailures: this.fallbackFailures,
      fallbackRate: totalSuccesses > 0 ? this.fallbackSuccesses / totalSuccesses : 0,
      totalRequests,
      successRate: totalRequests > 0 ? totalSuccesses / totalRequests : 1,
    };
  }

  /**
   * Verifica se fallback está configurado
   */
  hasFallback(): boolean {
    return this.fallback !== undefined;
  }

  /**
   * Retorna informações dos providers
   */
  getProviderInfo(): {
    primary: { model: string; dimension: number };
    fallback?: { model: string; dimension: number };
  } {
    const info: ReturnType<typeof this.getProviderInfo> = {
      primary: {
        model: this.primary.getModelName(),
        dimension: this.primary.getDimension(),
      },
    };

    if (this.fallback) {
      info.fallback = {
        model: this.fallback.getModelName(),
        dimension: this.fallback.getDimension(),
      };
    }

    return info;
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  /**
   * Delay assíncrono
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
