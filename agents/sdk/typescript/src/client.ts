/**
 * AuraCore Client
 * @module @auracore/sdk/client
 */

import { resolveConfig, validateApiKey } from './config';
import {
  AuraCoreError,
  NetworkError,
  TimeoutError,
} from './errors';
import {
  AgentsResource,
  VoiceResource,
  RAGResource,
  DocumentsResource,
  AnalyticsResource,
} from './resources';
import type { AuraCoreConfig, APIError } from './types';

const SDK_VERSION = '2.0.0';

/**
 * AuraCore SDK Client
 *
 * @example
 * ```typescript
 * const client = new AuraCore({ apiKey: 'ac_live_xxx' });
 *
 * // Chat with an agent
 * const response = await client.agents.chat('fiscal', 'Calcule o ICMS para SP');
 * console.log(response.message);
 *
 * // Transcribe audio
 * const transcription = await client.voice.transcribe(audioBase64);
 * console.log(transcription.text);
 * ```
 */
export class AuraCore {
  private readonly config: Required<AuraCoreConfig>;

  /** Agents resource */
  public readonly agents: AgentsResource;
  /** Voice resource */
  public readonly voice: VoiceResource;
  /** RAG resource */
  public readonly rag: RAGResource;
  /** Documents resource */
  public readonly documents: DocumentsResource;
  /** Analytics resource */
  public readonly analytics: AnalyticsResource;

  constructor(config: AuraCoreConfig) {
    this.config = resolveConfig(config);

    // Validate API key format
    if (!validateApiKey(this.config.apiKey)) {
      console.warn(
        'API key format may be invalid. Expected format: ac_live_* or ac_test_*'
      );
    }

    // Initialize resources
    const requestFn = this.request.bind(this);
    this.agents = new AgentsResource(requestFn);
    this.voice = new VoiceResource(requestFn);
    this.rag = new RAGResource(requestFn);
    this.documents = new DocumentsResource(requestFn);
    this.analytics = new AnalyticsResource(requestFn);
  }

  /**
   * Make an API request
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'User-Agent': `@auracore/sdk/${SDK_VERSION}`,
      ...this.config.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await this.fetchWithRetry(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          code: 'unknown_error',
          message: response.statusText,
          status: response.status,
        }))) as APIError;

        throw AuraCoreError.fromAPIError(error);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AuraCoreError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(
            `Request timeout after ${this.config.timeout}ms`
          );
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown error occurred');
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Retry on 429 or 5xx errors
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < (this.config.retry.maxRetries ?? 3)
      ) {
        const delay = this.calculateRetryDelay(attempt, response);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      // Retry on network errors
      if (attempt < (this.config.retry.maxRetries ?? 3)) {
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, response?: Response): number {
    // Check for Retry-After header
    if (response) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
          return seconds * 1000;
        }
      }
    }

    // Exponential backoff
    const initialDelay = this.config.retry.initialDelay ?? 1000;
    const maxDelay = this.config.retry.maxDelay ?? 30000;
    const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter
    return delay + Math.random() * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
