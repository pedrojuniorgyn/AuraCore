/**
 * Port Input: ISubmitIdeaUseCase
 * Submeter nova ideia ao banco de ideias (IdeaBox)
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { IdeaBox, IdeaSourceType, Priority } from '../../entities/IdeaBox';

export interface SubmitIdeaDTO {
  organizationId: number;
  branchId: number;
  title: string;
  description: string;
  sourceType: IdeaSourceType;
  category?: string;
  submittedBy: string;
  submittedByName?: string;
  department?: string;
  urgency?: Priority;
  importance?: Priority;
}

export interface ISubmitIdeaUseCase {
  execute(dto: SubmitIdeaDTO): Promise<Result<IdeaBox, string>>;
}
