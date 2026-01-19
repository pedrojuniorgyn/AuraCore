/**
 * OpenAIEmbedder - Infrastructure Implementation
 *
 * Implementação de IEmbedder usando OpenAI Embeddings API.
 *
 * @module fiscal/infrastructure/rag
 * @see IEmbedder (domain port)
 * @see E-Agent-Fase-D4
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IEmbedder } from '@/modules/fiscal/domain/ports/output/IEmbedder';

// ============================================================================
// TYPES
// ============================================================================

interface OpenAIEmbeddingData {
  embedding: number[];
  index: number;
}

interface OpenAIEmbeddingResponse {
  data: OpenAIEmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Implementação de IEmbedder usando OpenAI API.
 *
 * Modelos suportados:
 * - text-embedding-3-small (1536 dim, mais barato)
 * - text-embedding-3-large (3072 dim, melhor qualidade)
 * - text-embedding-ada-002 (1536 dim, legacy)
 */
@injectable()
export class OpenAIEmbedder implements IEmbedder {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimension: number;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? '';
    this.model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
    this.baseUrl = process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1';

    // Dimensões por modelo
    const dimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };
    this.dimension = dimensions[this.model] ?? 1536;
  }

  /**
   * Gera embedding para um texto.
   */
  async embed(text: string): Promise<Result<number[], string>> {
    if (!text || text.trim().length === 0) {
      return Result.fail('Texto vazio para embedding');
    }

    const result = await this.embedBatch([text.trim()]);
    if (Result.isFail(result)) {
      return result;
    }

    return Result.ok(result.value[0]);
  }

  /**
   * Gera embeddings para múltiplos textos (batch).
   */
  async embedBatch(texts: string[]): Promise<Result<number[][], string>> {
    if (!this.apiKey) {
      return Result.fail('OPENAI_API_KEY não configurada');
    }

    if (!texts || texts.length === 0) {
      return Result.fail('Lista de textos vazia');
    }

    // Filtrar textos vazios
    const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (validTexts.length === 0) {
      return Result.fail('Todos os textos estão vazios');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: validTexts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return Result.fail(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as OpenAIEmbeddingResponse;

      // Ordenar por index para garantir ordem correta
      const sortedData = [...data.data].sort((a, b) => a.index - b.index);
      const embeddings = sortedData.map((item) => item.embedding);

      return Result.ok(embeddings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`OpenAI embedding error: ${message}`);
    }
  }

  /**
   * Retorna dimensão do embedding.
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Verifica saúde do serviço.
   */
  async healthCheck(): Promise<Result<boolean, string>> {
    if (!this.apiKey) {
      return Result.fail('OPENAI_API_KEY não configurada');
    }

    try {
      // Fazer embedding de teste
      const result = await this.embed('test');
      return Result.isOk(result) ? Result.ok(true) : Result.fail(result.error);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Health check failed: ${message}`);
    }
  }
}
