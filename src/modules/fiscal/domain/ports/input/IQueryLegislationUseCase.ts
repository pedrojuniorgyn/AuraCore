/**
 * Input Port: IQueryLegislationUseCase
 *
 * Interface para caso de uso de consulta de legislação.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E-Agent-Fase-D4
 */

import type { Result } from '@/shared/domain';
import type { RAGResponse, LegislationCategory } from '../../services/rag/types';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Input para consulta de legislação.
 */
export interface QueryLegislationInput {
  /** Pergunta em linguagem natural */
  question: string;

  /** Filtro por categoria (opcional) */
  category?: LegislationCategory;

  /** Número máximo de resultados a considerar (default: 5) */
  topK?: number;
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Output da consulta de legislação.
 */
export interface QueryLegislationOutput extends RAGResponse {
  /** Pergunta original */
  question: string;
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de consulta de legislação.
 */
export interface IQueryLegislationUseCase {
  /**
   * Consulta a base de legislação.
   *
   * @param input - Dados de entrada
   * @returns Resposta com citações ou erro
   */
  execute(input: QueryLegislationInput): Promise<Result<QueryLegislationOutput, string>>;
}
