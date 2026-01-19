/**
 * Output Port: IAnswerGenerator
 *
 * Interface para gerador de respostas com LLM.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Infrastructure implementa Output Ports
 * @see E-Agent-Fase-D4
 */

import type { Result } from '@/shared/domain';
import type { DocumentChunk, RAGResponse } from '../../services/rag/types';

/**
 * Opções para geração de resposta.
 */
export interface AnswerGenerationOptions {
  /** Máximo de tokens na resposta */
  maxTokens?: number;

  /** Temperatura (0-1, menor = mais determinístico) */
  temperature?: number;

  /** Idioma da resposta */
  language?: 'pt-BR' | 'en';
}

/**
 * Interface para gerador de respostas.
 *
 * Implementações:
 * - ClaudeAnswerGenerator (Anthropic Claude)
 * - OpenAIAnswerGenerator (GPT-4)
 */
export interface IAnswerGenerator {
  /**
   * Gera resposta com base no contexto recuperado.
   *
   * @param query - Pergunta do usuário
   * @param context - Chunks de contexto recuperados
   * @param options - Opções de geração
   * @returns Resposta com citações ou erro
   */
  generate(
    query: string,
    context: DocumentChunk[],
    options?: AnswerGenerationOptions
  ): Promise<Result<RAGResponse, string>>;

  /**
   * Verifica saúde do serviço.
   *
   * @returns true se disponível ou erro
   */
  healthCheck(): Promise<Result<boolean, string>>;
}
