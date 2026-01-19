/**
 * Input Port: ICascadeGoalUseCase
 * Interface para desdobramento de metas
 * 
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';

export interface CascadeGoalInput {
  parentGoalId: string;
  children: Array<{
    code: string;
    description: string;
    targetValue: number;
    weight: number;
    ownerUserId: string;
    ownerBranchId: number;
    dueDate: Date;
  }>;
}

export interface CascadeGoalOutput {
  parentGoalId: string;
  parentCode: string;
  childrenCreated: Array<{
    id: string;
    code: string;
    cascadeLevel: string;
  }>;
  totalWeight: number;
}

export interface ICascadeGoalUseCase {
  execute(
    input: CascadeGoalInput,
    context: TenantContext
  ): Promise<Result<CascadeGoalOutput, string>>;
}
