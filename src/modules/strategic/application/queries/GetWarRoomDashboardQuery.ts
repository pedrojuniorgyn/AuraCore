/**
 * Use Case: GetWarRoomDashboardQuery
 * Busca dados consolidados para o Dashboard War Room
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { ISwotAnalysisRepository } from '../../domain/ports/output/ISwotAnalysisRepository';
import type { IWarRoomMeetingRepository } from '../../domain/ports/output/IWarRoomMeetingRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface GetWarRoomDashboardInput {
  strategyId?: string;
}

export interface KpiSummaryDTO {
  total: number;
  green: number;
  yellow: number;
  red: number;
  greenPercent: number;
  yellowPercent: number;
  redPercent: number;
}

export interface ActionPlanSummaryDTO {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  blocked: number;
  completionRate: number;
}

export interface SwotSummaryDTO {
  strengths: number;
  weaknesses: number;
  opportunities: number;
  threats: number;
  highPriorityCount: number;
  unconvertedCount: number;
}

export interface UpcomingMeetingDTO {
  id: string;
  title: string;
  meetingType: string;
  scheduledAt: Date;
  facilitatorUserId: string;
  participantsCount: number;
}

export interface CriticalItemDTO {
  id: string;
  type: 'KPI' | 'ACTION_PLAN' | 'SWOT';
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  responsible?: string;
  dueDate?: Date;
}

export interface WarRoomDashboardOutput {
  kpiSummary: KpiSummaryDTO;
  actionPlanSummary: ActionPlanSummaryDTO;
  swotSummary: SwotSummaryDTO;
  upcomingMeetings: UpcomingMeetingDTO[];
  criticalItems: CriticalItemDTO[];
  lastUpdated: Date;
}

export interface IGetWarRoomDashboardUseCase {
  execute(
    input: GetWarRoomDashboardInput,
    context: TenantContext
  ): Promise<Result<WarRoomDashboardOutput, string>>;
}

@injectable()
export class GetWarRoomDashboardQuery implements IGetWarRoomDashboardUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.SwotAnalysisRepository)
    private readonly swotRepository: ISwotAnalysisRepository,
    @inject(STRATEGIC_TOKENS.WarRoomMeetingRepository)
    private readonly meetingRepository: IWarRoomMeetingRepository
  ) {}

  async execute(
    input: GetWarRoomDashboardInput,
    context: TenantContext
  ): Promise<Result<WarRoomDashboardOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    const criticalItems: CriticalItemDTO[] = [];

    // 2. Buscar KPIs e calcular summary
    const { items: kpis } = await this.kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    const kpiSummary: KpiSummaryDTO = {
      total: kpis.length,
      green: kpis.filter((k) => k.status === 'GREEN').length,
      yellow: kpis.filter((k) => k.status === 'YELLOW').length,
      red: kpis.filter((k) => k.status === 'RED').length,
      greenPercent: 0,
      yellowPercent: 0,
      redPercent: 0,
    };

    if (kpiSummary.total > 0) {
      kpiSummary.greenPercent = Math.round((kpiSummary.green / kpiSummary.total) * 100);
      kpiSummary.yellowPercent = Math.round((kpiSummary.yellow / kpiSummary.total) * 100);
      kpiSummary.redPercent = Math.round((kpiSummary.red / kpiSummary.total) * 100);
    }

    // Adicionar KPIs críticos à lista
    for (const kpi of kpis.filter((k) => k.status === 'RED')) {
      criticalItems.push({
        id: kpi.id,
        type: 'KPI',
        title: `${kpi.code}: ${kpi.name}`,
        description: `Atual: ${kpi.currentValue} | Meta: ${kpi.targetValue} ${kpi.unit}`,
        priority: 'CRITICAL',
      });
    }

    // 3. Buscar Action Plans e calcular summary
    const { items: plans } = await this.actionPlanRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    const now = new Date();
    const overdueCount = plans.filter(
      (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.isOverdue
    ).length;

    const actionPlanSummary: ActionPlanSummaryDTO = {
      total: plans.length,
      completed: plans.filter((p) => p.status === 'COMPLETED').length,
      inProgress: plans.filter((p) => p.status === 'IN_PROGRESS').length,
      overdue: overdueCount,
      blocked: plans.filter((p) => p.status === 'BLOCKED').length,
      completionRate: 0,
    };

    if (actionPlanSummary.total > 0) {
      actionPlanSummary.completionRate = Math.round(
        (actionPlanSummary.completed / actionPlanSummary.total) * 100
      );
    }

    // Adicionar planos atrasados à lista crítica
    for (const plan of plans.filter((p) => p.isOverdue && p.status !== 'COMPLETED')) {
      const daysOverdue = Math.ceil(
        (now.getTime() - plan.whenEnd.getTime()) / (1000 * 60 * 60 * 24)
      );
      criticalItems.push({
        id: plan.id,
        type: 'ACTION_PLAN',
        title: `${plan.code}: ${plan.what.substring(0, 50)}...`,
        description: `${daysOverdue} dias atrasado`,
        priority: daysOverdue > 14 ? 'CRITICAL' : 'HIGH',
        responsible: plan.who,
        dueDate: plan.whenEnd,
      });
    }

    // 4. Buscar SWOT e calcular summary
    const { items: swotItems } = await this.swotRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    const swotSummary: SwotSummaryDTO = {
      strengths: swotItems.filter((s) => s.quadrant === 'STRENGTH').length,
      weaknesses: swotItems.filter((s) => s.quadrant === 'WEAKNESS').length,
      opportunities: swotItems.filter((s) => s.quadrant === 'OPPORTUNITY').length,
      threats: swotItems.filter((s) => s.quadrant === 'THREAT').length,
      highPriorityCount: swotItems.filter((s) => s.priorityScore >= 15).length,
      unconvertedCount: swotItems.filter((s) => !s.hasBeenConverted).length,
    };

    // Adicionar ameaças de alta prioridade à lista crítica
    for (const item of swotItems.filter((s) => s.quadrant === 'THREAT' && s.priorityScore >= 15)) {
      criticalItems.push({
        id: item.id,
        type: 'SWOT',
        title: `Ameaça: ${item.title}`,
        description: item.description ?? 'Sem descrição',
        priority: item.priorityScore >= 20 ? 'CRITICAL' : 'HIGH',
      });
    }

    // 5. Buscar próximas reuniões
    const upcomingMeetingsData = await this.meetingRepository.findUpcoming(
      context.organizationId,
      context.branchId,
      5
    );

    const upcomingMeetings: UpcomingMeetingDTO[] = upcomingMeetingsData.map((m) => ({
      id: m.id,
      title: m.title,
      meetingType: m.meetingType,
      scheduledAt: m.scheduledAt,
      facilitatorUserId: m.facilitatorUserId,
      participantsCount: m.participants.length,
    }));

    // 6. Ordenar itens críticos por prioridade
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    criticalItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return Result.ok({
      kpiSummary,
      actionPlanSummary,
      swotSummary,
      upcomingMeetings,
      criticalItems: criticalItems.slice(0, 10), // Limitar a 10 itens
      lastUpdated: new Date(),
    });
  }
}
