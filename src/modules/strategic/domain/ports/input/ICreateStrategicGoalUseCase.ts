/**
 * Input Port: ICreateStrategicGoalUseCase
 * Interface para criação de objetivo estratégico
 * 
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';

export interface CreateStrategicGoalInput {
  perspectiveId: string;
  parentGoalId?: string;
  code: string;
  description: string;
  cascadeLevel: string;
  targetValue: number;
  baselineValue?: number;
  unit: string;
  polarity?: 'UP' | 'DOWN';
  weight: number;
  ownerUserId: string;
  ownerBranchId: number;
  startDate: Date;
  dueDate: Date;
}

export interface CreateStrategicGoalOutput {
  id: string;
  code: string;
  description: string;
  cascadeLevel: string;
}

export interface ICreateStrategicGoalUseCase {
  execute(
    input: CreateStrategicGoalInput,
    context: TenantContext
  ): Promise<Result<CreateStrategicGoalOutput, string>>;
}
