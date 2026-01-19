/**
 * Output Port: IEmbedder
 *
 * Interface para serviço de embeddings vetoriais.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Infrastructure implementa Output Ports
 * @see E-Agent-Fase-D4
 */

import type { Result } from '@/shared/domain';

/**
 * Interface para serviço de embeddings.
 *
 * Implementações:
 * - OpenAIEmbedder (text-embedding-3-small)
 * - LocalEmbedder (sentence-transformers)
 */
export interface IEmbedder {
  /**
   * Gera embedding para um texto.
   *
   * @param text - Texto para vetorizar
   * @returns Vetor de embedding ou erro
   */
  embed(text: string): Promise<Result<number[], string>>;

  /**
   * Gera embeddings para múltiplos textos (batch).
   * Mais eficiente que chamadas individuais.
   *
   * @param texts - Lista de textos para vetorizar
   * @returns Lista de vetores de embedding ou erro
   */
  embedBatch(texts: string[]): Promise<Result<number[][], string>>;

  /**
   * Retorna a dimensão do vetor de embedding.
   * Necessário para configurar o vector store.
   *
   * @returns Dimensão do embedding (ex: 1536 para text-embedding-3-small)
   */
  getDimension(): number;

  /**
   * Verifica saúde do serviço.
   *
   * @returns true se disponível ou erro
   */
  healthCheck(): Promise<Result<boolean, string>>;
}
