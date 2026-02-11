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
import type { StrategicGoal } from '../../domain/entities/StrategicGoal';
import type { KPI } from '../../domain/entities/KPI';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

import { logger } from '@/shared/infrastructure/logging';
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
  execute(input: GetStrategyInput, context: TenantContext): Promise<Result<StrategyDTO, string>>;
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

  async execute(input: GetStrategyInput, context: TenantContext): Promise<Result<StrategyDTO, string>> {
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    const strategy = await this.strategyRepository.findById(
      input.strategyId,
      context.organizationId,
      context.branchId
    );

    if (!strategy) {
      return Result.fail('Estratégia não encontrada');
    }

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

    if (input.includeGoals !== false) {
      // ✅ CORREÇÃO BUG 2+3: Usar strategyId no filtro do repository (filtro SQL, não memória)
      // + Iterar páginas para garantir todos os goals (sem limite silencioso)
      const goalsResult = await this.fetchAllGoalsByStrategy(
        strategy.id,
        context.organizationId,
        context.branchId
      );

      if (Result.isFail(goalsResult)) {
        return Result.fail(goalsResult.error);
      }

      const goals = goalsResult.value;

      // ✅ OTIMIZAÇÃO N+1 QUERY: Buscar todos KPIs de uma vez (batch loading)
      let kpisByGoal: Map<string, KPI[]> = new Map();
      if (input.includeKpis && goals.length > 0) {
        const goalIds = goals.map(g => g.id);
        kpisByGoal = await this.kpiRepository.findByGoalIds(
          goalIds,
          context.organizationId,
          context.branchId
        );
      }

      dto.goals = goals.map((goal) => {
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

        if (input.includeKpis) {
          const kpis = kpisByGoal.get(goal.id) || [];
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
      });
    }

    return Result.ok(dto);
  }

  /**
   * Busca TODOS os goals de uma strategy usando PAGE PLANNING.
   *
   * PAGE PLANNING (enterprise-grade):
   * 1. Fetch página 1 para obter total
   * 2. Calcular requiredPages = ceil(total / PAGE_SIZE)
   * 3. Definir pagesToFetch = min(requiredPages, MAX_PAGES)
   * 4. Iterar com for (page=1; page <= pagesToFetch)
   * 5. Se requiredPages > MAX_PAGES: FAIL EXPLICITAMENTE (Modo A - Complete or Fail)
   *
   * Isso garante:
   * - Nunca "pular" a última página
   * - Nunca truncar silenciosamente
   * - Comportamento determinístico
   */
  private async fetchAllGoalsByStrategy(
    strategyId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<StrategicGoal[], string>> {
    const PAGE_SIZE = 100;
    const MAX_PAGES = 100; // Limite de segurança (10.000 goals máximo)
    const allGoals: StrategicGoal[] = [];

    // 1. Fetch página 1 para obter total
    const firstPage = await this.goalRepository.findMany({
      organizationId,
      branchId,
      strategyId,
      page: 1,
      pageSize: PAGE_SIZE,
    });

    const total = firstPage.total;
    allGoals.push(...firstPage.items);

    // 2. Calcular páginas necessárias
    const requiredPages = Math.ceil(total / PAGE_SIZE);
    const pagesToFetch = Math.min(requiredPages, MAX_PAGES);

    // 3. Se requiredPages > MAX_PAGES: FAIL EXPLICITAMENTE (Modo A - Complete or Fail)
    // GetStrategyQuery é backend/query interna - não pode retornar parcial sem erro
    if (requiredPages > MAX_PAGES) {
      const errorMsg =
        `[GetStrategyQuery] Truncamento não permitido: strategy ${strategyId} tem ${total} goals ` +
        `(${requiredPages} páginas), mas MAX_PAGES=${MAX_PAGES}. ` +
        `orgId=${organizationId}, branchId=${branchId}. ` +
        `Considere aumentar MAX_PAGES ou otimizar a query.`;
      logger.error('Error occurred', errorMsg);
      // Em vez de retornar parcial silenciosamente, retornamos Result.fail controlado
      return Result.fail(errorMsg);
    }

    // Warning se quantidade atípica (>1000 goals)
    if (total > 1000) {
      logger.warn(`Strategy tem ${total} goals - atípico para BSC, verificar dados`, { strategyId, total, organizationId, branchId });
    }

    // 4. Iterar páginas restantes (2 até pagesToFetch) - página 1 já foi buscada
    for (let page = 2; page <= pagesToFetch; page++) {
      const { items } = await this.goalRepository.findMany({
        organizationId,
        branchId,
        strategyId,
        page,
        pageSize: PAGE_SIZE,
      });

      // Proteção contra inconsistência: página vazia antes de completar
      if (items.length === 0) {
        logger.warn('Paginação inconsistente: página retornou 0 items', { strategyId, organizationId, branchId, page, pagesToFetch, total, currentCount: allGoals.length });
        break;
      }

      allGoals.push(...items);
    }

    return Result.ok(allGoals);
  }
}