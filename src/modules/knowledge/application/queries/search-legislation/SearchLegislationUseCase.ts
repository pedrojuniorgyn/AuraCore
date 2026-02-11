/**
 * SearchLegislationUseCase - Application Query
 * 
 * Use case para busca em legislação fiscal brasileira.
 * Usa o vector store para busca semântica e retorna respostas estruturadas.
 * 
 * Atualizado: Phase D.3 - Integração com EmbeddingService
 * 
 * @module knowledge/application/queries
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { LegislationSearchService } from '../../../domain/services/LegislationSearchService';
import type { IVectorStore } from '../../../domain/ports/output/IVectorStore';
import type { IEmbeddingService } from '../../../domain/ports/output/IEmbeddingService';
import type {
  ISearchLegislationUseCase,
  SearchLegislationInput,
  SearchLegislationOutput,
} from '../../../domain/ports/input';
import type { SearchOptionsWithEmbedding } from '../../../infrastructure/vector-store';

// Re-export input/output for consumers
export type { SearchLegislationInput, SearchLegislationOutput };

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Use Case para busca em legislação fiscal
 *
 * Fluxo:
 * 1. Detectar tipos de legislação na query
 * 2. Gerar embedding da query (se embedding service disponível)
 * 3. Buscar documentos similares no vector store
 * 4. Formatar resposta com fontes e confiança
 *
 * @implements ISearchLegislationUseCase
 */
@injectable()
export class SearchLegislationUseCase implements ISearchLegislationUseCase {
  constructor(
    @inject(TOKENS.KnowledgeVectorStore) private readonly vectorStore: IVectorStore,
    @inject(TOKENS.KnowledgeEmbeddingService) private readonly embeddingService: IEmbeddingService
  ) {}

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

    // 5. Gerar embedding da query (se serviço disponível)
    let queryEmbedding: number[] | undefined;
    
    if (this.embeddingService) {
      const embeddingResult = await this.embeddingService.generateEmbedding(trimmedQuery);
      
      if (Result.isOk(embeddingResult)) {
        queryEmbedding = embeddingResult.value;
      }
      // Se embedding falhar, continua com busca por texto (fallback)
    }

    // 6. Buscar no vector store
    const searchOptions: SearchOptionsWithEmbedding = {
      query: trimmedQuery,
      queryEmbedding,
      topK,
      minScore: input.minScore ?? 0.3,
      filters: {
        legislationType: detectedTypes,
        organizationId: input.organizationId,
      },
    };

    const searchResult = await this.vectorStore.search(searchOptions);

    if (Result.isFail(searchResult)) {
      return Result.fail(searchResult.error);
    }

    const results = searchResult.value;

    // 7. Filtrar documentos revogados se necessário
    const filteredResults = input.includeRevoked
      ? results
      : results.filter(r => !r.document.expirationDate);

    // 8. Formatar resposta
    const formatResult = LegislationSearchService.formatSearchResults(
      filteredResults,
      trimmedQuery
    );

    if (Result.isFail(formatResult)) {
      return Result.fail(formatResult.error);
    }

    const answer = formatResult.value;
    const searchTimeMs = Date.now() - startTime;

    // 9. Retornar output completo
    return Result.ok({
      ...answer,
      detectedTypes,
      totalResults: filteredResults.length,
      searchTimeMs,
      queryComplexity,
    });
  }
}
