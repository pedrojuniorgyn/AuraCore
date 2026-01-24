/**
 * Docling Client
 * ==============
 *
 * Cliente TypeScript para comunicação com o serviço Docling (Docker).
 * Provê métodos para processamento de documentos PDF com Result pattern.
 *
 * @example
 * ```typescript
 * const client = new DoclingClient();
 *
 * // Health check
 * const health = await client.healthCheck();
 * if (Result.isFail(health)) {
 *   console.error('Serviço indisponível:', health.error);
 *   return;
 * }
 *
 * // Processar documento
 * const result = await client.processDocument('uploads/danfe.pdf');
 * if (Result.isOk(result)) {
 *   console.log('Texto:', result.value.text);
 *   console.log('Tabelas:', result.value.tables.length);
 * }
 * ```
 *
 * @module shared/infrastructure/docling
 * @see E-Agent-Fase-D1
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  DoclingConfig,
  DocumentExtractionResult,
  ExtractedTable,
  HealthStatus,
  RawProcessResponse,
  RawExtractTablesResponse,
  RawExtractTextResponse,
  RawHealthResponse,
} from './types';

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CONFIG: DoclingConfig = {
  baseUrl: process.env.DOCLING_URL ?? 'http://localhost:8000',
  timeout: Number(process.env.DOCLING_TIMEOUT) || 60000, // 60s para PDFs grandes
  retries: 3,
  retryDelay: 1000,
};

// ============================================================================
// CLIENT
// ============================================================================

/**
 * Cliente para comunicação com o serviço Docling.
 *
 * O Docling é um serviço Python (Docker) que processa PDFs usando
 * a biblioteca Docling da IBM, com 97.9% de precisão.
 */
@injectable()
export class DoclingClient {
  private readonly config: DoclingConfig;

  /**
   * Cria uma nova instância do DoclingClient.
   *
   * @param config - Configuração opcional (usa defaults se não fornecido)
   */
  constructor(config?: Partial<DoclingConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Verifica saúde do serviço Docling.
   *
   * @returns Status de saúde do serviço
   */
  async healthCheck(): Promise<Result<HealthStatus, string>> {
    try {
      const response = await this.fetchWithRetry<RawHealthResponse>(
        '/health',
        {
          method: 'GET',
        },
        1 // Apenas 1 tentativa para health check
      );

      if (Result.isFail(response)) {
        return response;
      }

      const raw = response.value;
      return Result.ok({
        status: raw.status === 'healthy' ? 'healthy' : 'unhealthy',
        version: raw.version,
        uptime: raw.uptime,
        doclingVersion: raw.docling_version,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro no health check: ${message}`);
    }
  }

  /**
   * Processa documento PDF completo.
   *
   * Extrai texto, tabelas e metadados do documento.
   *
   * @param filePath - Caminho do arquivo dentro do volume uploads/
   * @returns Resultado da extração completa
   */
  async processDocument(
    filePath: string
  ): Promise<Result<DocumentExtractionResult, string>> {
    try {
      const response = await this.fetchWithRetry<RawProcessResponse>(
        '/process',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath }),
        }
      );

      if (Result.isFail(response)) {
        return response;
      }

      const raw = response.value;
      return Result.ok(this.mapProcessResponse(raw));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao processar documento: ${message}`);
    }
  }

  /**
   * Extrai apenas tabelas do documento.
   *
   * @param filePath - Caminho do arquivo dentro do volume uploads/
   * @returns Lista de tabelas extraídas
   */
  async extractTables(
    filePath: string
  ): Promise<Result<ExtractedTable[], string>> {
    try {
      const response = await this.fetchWithRetry<RawExtractTablesResponse>(
        '/extract-tables',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath }),
        }
      );

      if (Result.isFail(response)) {
        return response;
      }

      const raw = response.value;
      const tables = raw.tables.map(this.mapTable);
      return Result.ok(tables);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao extrair tabelas: ${message}`);
    }
  }

  /**
   * Extrai apenas texto do documento.
   *
   * @param filePath - Caminho do arquivo dentro do volume uploads/
   * @returns Texto extraído em formato markdown
   */
  async extractText(filePath: string): Promise<Result<string, string>> {
    try {
      const response = await this.fetchWithRetry<RawExtractTextResponse>(
        '/extract-text',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath }),
        }
      );

      if (Result.isFail(response)) {
        return response;
      }

      return Result.ok(response.value.text);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao extrair texto: ${message}`);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Executa requisição HTTP com retry e timeout.
   *
   * @param path - Path do endpoint (ex: /process)
   * @param options - Opções do fetch
   * @param maxRetries - Número máximo de tentativas (default: config.retries)
   * @returns Resposta parseada como JSON
   */
  private async fetchWithRetry<T>(
    path: string,
    options: RequestInit,
    maxRetries?: number
  ): Promise<Result<T, string>> {
    const url = `${this.config.baseUrl}${path}`;
    const retries = maxRetries ?? this.config.retries;

    let lastError: string = 'Erro desconhecido';

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Tentar extrair mensagem de erro do body
          let errorDetail = '';
          try {
            const errorBody = (await response.json()) as { detail?: string };
            errorDetail = errorBody.detail ?? '';
          } catch {
            // Ignorar erro ao parsear body de erro
          }

          const errorMessage = errorDetail || response.statusText;
          lastError = `Erro ${response.status}: ${errorMessage}`;

          // Não fazer retry para erros de cliente (4xx)
          if (response.status >= 400 && response.status < 500) {
            return Result.fail(lastError);
          }

          // Para erros de servidor (5xx), tentar novamente se não é última tentativa
          if (attempt < retries) {
            await this.sleep(this.config.retryDelay * attempt);
            continue;
          }

          // Última tentativa falhou - retornar erro
          return Result.fail(lastError);
        }

        const data = (await response.json()) as T;
        return Result.ok(data);
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = `Timeout após ${this.config.timeout}ms`;
          } else {
            lastError = error.message;
          }
        } else {
          lastError = String(error);
        }

        // Se não é a última tentativa, esperar antes de retry
        if (attempt < retries) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    return Result.fail(lastError);
  }

  /**
   * Mapeia resposta raw de /process para tipo tipado.
   */
  private mapProcessResponse(
    raw: RawProcessResponse
  ): DocumentExtractionResult {
    return {
      text: raw.text,
      tables: raw.tables.map(this.mapTable),
      metadata: {
        pageCount: raw.metadata.page_count,
        title: raw.metadata.title ?? undefined,
        author: raw.metadata.author ?? undefined,
        creationDate: raw.metadata.creation_date ?? undefined,
        fileSize: raw.metadata.file_size,
      },
      processingTimeMs: raw.processing_time_ms,
    };
  }

  /**
   * Mapeia tabela raw para tipo tipado.
   */
  private mapTable = (
    raw: RawProcessResponse['tables'][number]
  ): ExtractedTable => {
    return {
      index: raw.index,
      headers: raw.headers,
      rows: raw.rows,
      pageNumber: raw.page_number,
      bbox: raw.bbox
        ? {
            x: raw.bbox.x,
            y: raw.bbox.y,
            width: raw.bbox.width,
            height: raw.bbox.height,
          }
        : undefined,
    };
  };

  /**
   * Utilitário para sleep/delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Cria uma instância do DoclingClient com configuração padrão.
 *
 * @param config - Configuração opcional
 * @returns Nova instância do DoclingClient
 */
export function createDoclingClient(
  config?: Partial<DoclingConfig>
): DoclingClient {
  return new DoclingClient(config);
}
