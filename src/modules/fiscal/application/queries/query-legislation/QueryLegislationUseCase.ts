/**
 * QueryLegislationUseCase - Application Query
 *
 * Caso de uso para consulta de legislação no sistema RAG.
 *
 * @module fiscal/application/queries/query-legislation
 * @see USE-CASE-001 a USE-CASE-015
 * @see E-Agent-Fase-D4
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IQueryLegislationUseCase,
  QueryLegislationInput,
  QueryLegislationOutput,
} from '@/modules/fiscal/domain/ports/input/IQueryLegislationUseCase';
import type { LegislationRAG } from '@/modules/fiscal/application/services/LegislationRAG';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para consulta de legislação.
 *
 * Usa LegislationRAG para responder perguntas sobre legislação fiscal.
 */
@injectable()
export class QueryLegislationUseCase implements IQueryLegislationUseCase {
  constructor(
    @inject(TOKENS.LegislationRAG)
    private readonly legislationRAG: LegislationRAG
  ) {}

  /**
   * Executa a consulta de legislação.
   */
  async execute(
    input: QueryLegislationInput
  ): Promise<Result<QueryLegislationOutput, string>> {
    // 1. Validar input
    const validationResult = this.validateInput(input);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // 2. Executar consulta RAG
    const queryResult = await this.legislationRAG.query(input.question);

    if (Result.isFail(queryResult)) {
      return Result.fail(queryResult.error);
    }

    // 3. Retornar resultado com pergunta original
    return Result.ok({
      ...queryResult.value,
      question: input.question,
    });
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Valida input do caso de uso.
   */
  private validateInput(input: QueryLegislationInput): Result<void, string> {
    if (!input) {
      return Result.fail('Input é obrigatório');
    }

    if (!input.question) {
      return Result.fail('Pergunta é obrigatória');
    }

    const trimmed = input.question.trim();
    if (trimmed.length === 0) {
      return Result.fail('Pergunta não pode ser vazia');
    }

    if (trimmed.length < 5) {
      return Result.fail('Pergunta muito curta (mínimo 5 caracteres)');
    }

    if (trimmed.length > 2000) {
      return Result.fail('Pergunta muito longa (máximo 2000 caracteres)');
    }

    return Result.ok(undefined);
  }
}
