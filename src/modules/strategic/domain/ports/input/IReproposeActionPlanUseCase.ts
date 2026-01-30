/**
 * Port Input: IReproposeActionPlanUseCase
 * Interface do use case de reproposição
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { ReproposeActionPlanInput, ReproposeActionPlanOutput } from '../../../application/dtos/ReproposeActionPlanDTO';

export interface IReproposeActionPlanUseCase {
  execute(
    input: ReproposeActionPlanInput,
    context: TenantContext
  ): Promise<Result<ReproposeActionPlanOutput, string>>;
}
