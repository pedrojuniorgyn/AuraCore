/**
 * 🔄 SEFAZ RETRY POLICY - DOMAIN SERVICE (DOMAIN-SVC-001)
 * 
 * Implementa exponential backoff para comunicação com SEFAZ.
 * 100% stateless, ZERO dependências de infraestrutura.
 * 
 * F3.1: Comunicação real com SEFAZ
 * 
 * Regras SEFAZ:
 * - Timeout padrão: 30s
 * - Retry em erros de rede (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
 * - Retry em HTTP 500, 502, 503, 504
 * - NÃO retry em 400, 401, 403, 422 (erros de negócio)
 * - Máximo 3 tentativas com backoff exponencial
 * - Base delay: 2s, max delay: 30s
 */

import { Result } from '@/shared/domain';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export interface RetryAttemptResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  attempt: number;
  delayMs: number;
}

const RETRYABLE_HTTP_CODES = new Set([500, 502, 503, 504, 408, 429]);
const RETRYABLE_NETWORK_ERRORS = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET',
  'EHOSTUNREACH', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT',
]);

export class SefazRetryPolicy {
  private constructor() {} // DOMAIN-SVC-002: Constructor privado

  static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    timeoutMs: 30000,
  };

  /**
   * Calcula delay para uma tentativa usando exponential backoff com jitter.
   * Formula: min(baseDelay * 2^attempt + random(0, 1000), maxDelay)
   */
  static calculateDelay(attempt: number, config: RetryConfig = SefazRetryPolicy.DEFAULT_CONFIG): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 1000);
    return Math.min(exponentialDelay + jitter, config.maxDelayMs);
  }

  /**
   * Determina se um erro é retryable.
   */
  static isRetryable(statusCode?: number, errorCode?: string): boolean {
    if (errorCode && RETRYABLE_NETWORK_ERRORS.has(errorCode)) {
      return true;
    }
    if (statusCode && RETRYABLE_HTTP_CODES.has(statusCode)) {
      return true;
    }
    return false;
  }

  /**
   * Determina se um erro SEFAZ é retryable baseado no cStat.
   * cStat 108 = Serviço Paralisado Momentaneamente
   * cStat 109 = Serviço Paralisado sem Previsão
   */
  static isSefazRetryable(cStat: number): boolean {
    const retryableCStats = new Set([108, 109]);
    return retryableCStats.has(cStat);
  }

  /**
   * Executa função com retry e exponential backoff.
   * Retorna Result com dados ou erro após todas tentativas.
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = SefazRetryPolicy.DEFAULT_CONFIG
  ): Promise<Result<T, string>> {
    let lastError = '';

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        const result = await Promise.race([
          fn(),
          SefazRetryPolicy.timeout(config.timeoutMs),
        ]) as T;

        return Result.ok(result);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error.message;

        const errorCode = (error as NodeJS.ErrnoException).code;
        const statusCode = (error as { statusCode?: number }).statusCode;

        // Não retry em erros de negócio
        if (!SefazRetryPolicy.isRetryable(statusCode, errorCode)) {
          return Result.fail(
            `SEFAZ erro não-retryable (attempt ${attempt + 1}): ${error.message}`
          );
        }

        // Último attempt - não esperar delay
        if (attempt < config.maxAttempts - 1) {
          const delay = SefazRetryPolicy.calculateDelay(attempt, config);
          await SefazRetryPolicy.sleep(delay);
        }
      }
    }

    return Result.fail(
      `SEFAZ falhou após ${config.maxAttempts} tentativas. Último erro: ${lastError}`
    );
  }

  /** Helper: sleep com promise */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Helper: timeout promise */
  private static timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: SEFAZ não respondeu em ${ms}ms`)), ms)
    );
  }
}
