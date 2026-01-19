/**
 * SearchLegislationUseCase - Application Query
 * 
 * Use case para busca em legislação fiscal brasileira.
 * Usa o vector store para busca semântica e retorna respostas estruturadas.
 * 
 * @module knowledge/application/queries
 */

import { Result } from '@/shared/domain';
import { LegislationSearchService } from '../../../domain/services/LegislationSearchService';
import type { IVectorStore } from '../../../domain/ports/output/IVectorStore';
import type {
  LegislationType,
  LegislationAnswer,
} from '../../../domain/types';

// ============================================================================
// INPUT/OUTPUT
// ============================================================================

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
// USE CASE
// ============================================================================

/**
 * Use Case para busca em legislação fiscal
 */
export class SearchLegislationUseCase {
  constructor(private readonly vectorStore: IVectorStore) {}

  /**
   * Executa a busca
   */
  async execute(input: SearchLegislationInput): Promise<Result<SearchLegislationOutput, string>> {
    const startTime = Date.now();

    // 1. Validar input
    const trimmedQuery = input.query?.trim() ?? '';
    if (trimmedQuery.length < 3) {
      return Result.fail('Query deve ter pelo menos 3 caracteres');
    }

    // 2. Detectar tipos de legislação se não especificados
    const detectedTypes = input.legislationTypes ?? 
      LegislationSearchService.identifyLegislationType(trimmedQuery);

    // 3. Classificar complexidade da query
    const queryComplexity = LegislationSearchService.classifyQueryComplexity(trimmedQuery);

    // 4. Ajustar topK baseado na complexidade
    let topK = input.topK ?? 5;
    if (queryComplexity === 'complex') {
      topK = Math.max(topK, 8); // Queries complexas precisam de mais contexto
    }

    // 5. Buscar no vector store
    const searchResult = await this.vectorStore.search({
      query: trimmedQuery,
      topK,
      minScore: input.minScore ?? 0.3,
      filters: {
        legislationType: detectedTypes,
        organizationId: input.organizationId,
      },
    });

    if (Result.isFail(searchResult)) {
      return Result.fail(searchResult.error);
    }

    const results = searchResult.value;

    // 6. Filtrar documentos revogados se necessário
    const filteredResults = input.includeRevoked
      ? results
      : results.filter(r => !r.document.expirationDate);

    // 7. Formatar resposta
    const formatResult = LegislationSearchService.formatSearchResults(
      filteredResults,
      trimmedQuery
    );

    if (Result.isFail(formatResult)) {
      return Result.fail(formatResult.error);
    }

    const answer = formatResult.value;
    const searchTimeMs = Date.now() - startTime;

    // 8. Retornar output completo
    return Result.ok({
      ...answer,
      detectedTypes,
      totalResults: filteredResults.length,
      searchTimeMs,
      queryComplexity,
    });
  }
}
