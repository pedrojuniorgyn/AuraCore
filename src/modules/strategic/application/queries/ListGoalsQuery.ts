/**
 * Use Case: ListGoalsQuery
 * Lista objetivos estratégicos com filtros
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface ListGoalsInput {
  perspectiveId?: string;
  status?: string;
  ownerUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface GoalListItemDTO {
  id: string;
  code: string;
  description: string;
  perspectiveId: string;
  parentGoalId: string | null;
  cascadeLevel: string;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  status: string;
  ownerUserId: string;
  ownerBranchId: number;
  startDate: Date;
  dueDate: Date;
  unit: string;
  polarity: string;
  weight: number;
}

export interface ListGoalsOutput {
  items: GoalListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IListGoalsUseCase {
  execute(
    input: ListGoalsInput,
    context: TenantContext
  ): Promise<Result<ListGoalsOutput, string>>;
}

@injectable()
export class ListGoalsQuery implements IListGoalsUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    input: ListGoalsInput,
    context: TenantContext
  ): Promise<Result<ListGoalsOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    // 2. Buscar objetivos
    const { items: goals, total } = await this.goalRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      perspectiveId: input.perspectiveId,
      status: input.status,
      ownerUserId: input.ownerUserId,
      page,
      pageSize,
    });

    // 3. Mapear para DTOs
    const items: GoalListItemDTO[] = goals.map((goal) => ({
      id: goal.id,
      code: goal.code,
      description: goal.description,
      perspectiveId: goal.perspectiveId,
      parentGoalId: goal.parentGoalId,
      cascadeLevel: goal.cascadeLevel.value,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progressPercent: goal.progress,
      status: goal.status.value,
      ownerUserId: goal.ownerUserId,
      ownerBranchId: goal.ownerBranchId,
      startDate: goal.startDate,
      dueDate: goal.dueDate,
      unit: goal.unit,
      polarity: goal.polarity,
      weight: goal.weight,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return Result.ok({
      items,
      total,
      page,
      pageSize,
      totalPages,
    });
  }
}
