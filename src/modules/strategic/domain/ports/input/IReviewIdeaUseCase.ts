/**
 * Port Input: IReviewIdeaUseCase
 * Revisar ideia (aprovar ou rejeitar)
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { IdeaBox } from '../../entities/IdeaBox';

export type ReviewDecision = 'APPROVE' | 'REJECT';

export interface ReviewIdeaDTO {
  ideaId: string;
  organizationId: number;
  branchId: number;
  decision: ReviewDecision;
  reviewedBy: string;
  reviewNotes?: string;
}

export interface IReviewIdeaUseCase {
  execute(dto: ReviewIdeaDTO): Promise<Result<IdeaBox, string>>;
}
