/**
 * IEmbeddingService - Output Port para geração de embeddings
 * 
 * Interface que define o contrato para implementações de
 * serviços de embedding (OpenAI, Cohere, local models, etc.)
 * 
 * @module knowledge/domain/ports/output
 */

import type { Result } from '@/shared/domain';

/**
 * Interface para geração de embeddings vetoriais
 */
export interface IEmbeddingService {
  /**
   * Gera embeddings para uma lista de textos
   * @param texts - Textos para gerar embeddings
   * @returns Array de vetores de embedding
   */
  generateEmbeddings(texts: string[]): Promise<Result<number[][], string>>;

  /**
   * Gera embedding para um único texto
   * @param text - Texto para gerar embedding
   * @returns Vetor de embedding
   */
  generateEmbedding(text: string): Promise<Result<number[], string>>;

  /**
   * Retorna a dimensão dos embeddings gerados
   * Ex: 1536 para OpenAI text-embedding-ada-002
   */
  getDimension(): number;

  /**
   * Retorna o nome/ID do modelo utilizado
   */
  getModelName(): string;
}
