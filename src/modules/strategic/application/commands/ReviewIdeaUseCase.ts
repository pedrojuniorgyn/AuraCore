/**
 * Use Case: ReviewIdeaUseCase
 * Revisar ideia (aprovar ou rejeitar)
 *
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IdeaBox } from '../../domain/entities/IdeaBox';
import type { IReviewIdeaUseCase, ReviewIdeaDTO } from '../../domain/ports/input/IReviewIdeaUseCase';
import type { IIdeaBoxRepository } from '../../domain/ports/output/IIdeaBoxRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ReviewIdeaUseCase implements IReviewIdeaUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.IdeaBoxRepository)
    private readonly repository: IIdeaBoxRepository
  ) {}

  async execute(dto: ReviewIdeaDTO): Promise<Result<IdeaBox, string>> {
    // Buscar ideia
    const idea = await this.repository.findById(
      dto.ideaId,
      dto.organizationId,
      dto.branchId
    );

    if (!idea) {
      return Result.fail('Ideia não encontrada');
    }

    // Aplicar decisão
    let reviewResult: Result<void, string>;

    if (dto.decision === 'APPROVE') {
      reviewResult = idea.approve(dto.reviewedBy, dto.reviewNotes);
    } else {
      // REJECT requer notas
      if (!dto.reviewNotes?.trim()) {
        return Result.fail('Justificativa de rejeição é obrigatória');
      }
      reviewResult = idea.reject(dto.reviewedBy, dto.reviewNotes);
    }

    if (Result.isFail(reviewResult)) {
      return Result.fail(reviewResult.error);
    }

    // Persistir
    await this.repository.save(idea);

    return Result.ok(idea);
  }
}
