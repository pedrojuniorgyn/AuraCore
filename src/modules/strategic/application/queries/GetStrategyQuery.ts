/**
 * Use Case: GetStrategyQuery
 * Busca estratégia completa com objetivos e KPIs
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IStrategyRepository } from '../../domain/ports/output/IStrategyRepository';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface GetStrategyInput {
  strategyId: string;
  includeGoals?: boolean;
  includeKpis?: boolean;
}

export interface StrategyDTO {
  id: string;
  name: string;
  vision: string | null;
  mission: string | null;
  values: string[];
  status: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  goals?: GoalDTO[];
}

export interface GoalDTO {
  id: string;
  code: string;
  description: string;
  perspectiveId: string;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  status: string;
  kpis?: KpiDTO[];
}

export interface KpiDTO {
  id: string;
  code: string;
  name: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  status: string;
}

export interface IGetStrategyUseCase {
  execute(
    input: GetStrategyInput,
    context: TenantContext
  ): Promise<Result<StrategyDTO, string>>;
}

@injectable()
export class GetStrategyQuery implements IGetStrategyUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.StrategyRepository)
    private readonly strategyRepository: IStrategyRepository,
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository,
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository
  ) {}

  async execute(
    input: GetStrategyInput,
    context: TenantContext
  ): Promise<Result<StrategyDTO, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Buscar estratégia
    const strategy = await this.strategyRepository.findById(
      input.strategyId,
      context.organizationId,
      context.branchId
    );

    if (!strategy) {
      return Result.fail('Estratégia não encontrada');
    }

    // 3. Montar DTO base
    const dto: StrategyDTO = {
      id: strategy.id,
      name: strategy.name,
      vision: strategy.vision,
      mission: strategy.mission,
      values: strategy.values,
      status: strategy.status,
      period: {
        startDate: strategy.startDate,
        endDate: strategy.endDate,
      },
    };

    // 4. Incluir objetivos se solicitado
    if (input.includeGoals !== false) {
      const { items: goals } = await this.goalRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        page: 1,
        pageSize: 100,
      });

      dto.goals = await Promise.all(
        goals.map(async (goal) => {
          const goalDto: GoalDTO = {
            id: goal.id,
            code: goal.code,
            description: goal.description,
            perspectiveId: goal.perspectiveId,
            targetValue: goal.targetValue,
            currentValue: goal.currentValue,
            progressPercent: goal.progress,
            status: goal.status.value,
          };

          // 5. Incluir KPIs do objetivo se solicitado
          if (input.includeKpis) {
            const kpis = await this.kpiRepository.findByGoalId(
              goal.id,
              context.organizationId,
              context.branchId
            );

            goalDto.kpis = kpis.map((kpi) => ({
              id: kpi.id,
              code: kpi.code,
              name: kpi.name,
              unit: kpi.unit,
              targetValue: kpi.targetValue,
              currentValue: kpi.currentValue,
              status: kpi.status,
            }));
          }

          return goalDto;
        })
      );
    }

    return Result.ok(dto);
  }
}
