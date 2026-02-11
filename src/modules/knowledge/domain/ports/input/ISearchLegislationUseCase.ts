/**
 * Input Port: ISearchLegislationUseCase
 *
 * Interface para caso de uso de busca em legislação fiscal brasileira.
 * Usa o vector store para busca semântica e retorna respostas estruturadas.
 *
 * @module knowledge/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 */

import type { Result } from '@/shared/domain';
import type { LegislationType, LegislationAnswer } from '../../types';

// ============================================================================
// INPUT
// ============================================================================

/**
 * Input para busca em legislação.
 */
export interface SearchLegislationInput {
  /** Pergunta ou query de busca */
  query: string;

  /** Tipos de legislação para filtrar (auto-detectado se não fornecido) */
  legislationTypes?: LegislationType[];

  /** Número máximo de resultados (default: 5) */
  topK?: number;

  /** Score mínimo para incluir (default: 0.3) */
  minScore?: number;

  /** Incluir documentos revogados */
  includeRevoked?: boolean;

  /** ID da organização (para documentos privados) */
  organizationId?: number;
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Output da busca em legislação.
 */
export interface SearchLegislationOutput extends LegislationAnswer {
  /** Tipos de legislação detectados */
  detectedTypes: LegislationType[];

  /** Número total de resultados encontrados */
  totalResults: number;

  /** Tempo de busca em ms */
  searchTimeMs: number;

  /** Complexidade da query */
  queryComplexity: 'simple' | 'moderate' | 'complex';
}

// ============================================================================
// USE CASE INTERFACE
// ============================================================================

/**
 * Interface do caso de uso de busca em legislação fiscal.
 */
export interface ISearchLegislationUseCase {
  /**
   * Busca em legislação fiscal brasileira.
   *
   * @param input - Query e filtros de busca
   * @returns Resposta formatada com fontes e confiança
   */
  execute(input: SearchLegislationInput): Promise<Result<SearchLegislationOutput, string>>;
}
