/**
 * Use Case: GenerateAgendaUseCase
 * Gera pauta automática para reunião
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { IIdeaBoxRepository } from '../../domain/ports/output/IIdeaBoxRepository';
import {
  AgendaGeneratorService,
  type MeetingType,
  type GeneratedAgenda,
  type AgendaSource,
} from '../../domain/services/AgendaGeneratorService';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface GenerateAgendaInput {
  meetingType: MeetingType;
  meetingDate: Date;
}

export interface IGenerateAgendaUseCase {
  execute(
    input: GenerateAgendaInput,
    context: TenantContext
  ): Promise<Result<GeneratedAgenda, string>>;
}

@injectable()
export class GenerateAgendaUseCase implements IGenerateAgendaUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.IdeaBoxRepository)
    private readonly ideaBoxRepository: IIdeaBoxRepository
  ) {}

  async execute(
    input: GenerateAgendaInput,
    context: TenantContext
  ): Promise<Result<GeneratedAgenda, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    const automaticSources: AgendaSource[] = [];

    // 2. Buscar KPIs críticos e em alerta
    const { items: kpis } = await this.kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 100,
    });

    for (const kpi of kpis) {
      if (kpi.status === 'RED') {
        automaticSources.push({
          type: 'KPI_CRITICAL',
          entityId: kpi.id,
          title: `${kpi.code}: ${kpi.name}`,
          description: `Valor atual: ${kpi.currentValue} | Meta: ${kpi.targetValue} ${kpi.unit}`,
          priority: 'CRITICAL',
        });
      } else if (kpi.status === 'YELLOW') {
        automaticSources.push({
          type: 'KPI_ALERT',
          entityId: kpi.id,
          title: `${kpi.code}: ${kpi.name}`,
          description: `Valor atual: ${kpi.currentValue} | Meta: ${kpi.targetValue} ${kpi.unit}`,
          priority: 'HIGH',
        });
      }
    }

    // 3. Buscar planos de ação vencidos
    const { items: plans } = await this.actionPlanRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 100,
    });

    const now = new Date();
    for (const plan of plans) {
      if (plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && plan.isOverdue) {
        const daysOverdue = Math.ceil(
          (now.getTime() - plan.whenEnd.getTime()) / (1000 * 60 * 60 * 24)
        );
        automaticSources.push({
          type: 'ACTION_PLAN_OVERDUE',
          entityId: plan.id,
          title: `${plan.code}: ${plan.what.substring(0, 50)}...`,
          description: `Responsável: ${plan.who} | ${daysOverdue} dias atrasado`,
          priority: daysOverdue > 14 ? 'CRITICAL' : 'HIGH',
          daysPending: daysOverdue,
        });
      }
    }

    // 4. Buscar ideias aprovadas pendentes (apenas para DIRECTOR e BOARD)
    if (input.meetingType === 'BOARD' || input.meetingType === 'DIRECTOR') {
      const { items: ideas } = await this.ideaBoxRepository.findMany({
        organizationId: context.organizationId,
        branchId: context.branchId,
        status: 'APPROVED',
        page: 1,
        pageSize: 20,
      });

      for (const idea of ideas) {
        automaticSources.push({
          type: 'IDEA_PENDING',
          entityId: idea.id,
          title: `Ideia: ${idea.title}`,
          description: idea.description.substring(0, 100),
          priority: 'MEDIUM',
        });
      }
    }

    // 5. Obter itens recorrentes padrão
    const recurringItems = AgendaGeneratorService.getDefaultRecurringItems();

    // 6. Gerar pauta
    return AgendaGeneratorService.generateAgenda(
      input.meetingType,
      input.meetingDate,
      recurringItems,
      automaticSources
    );
  }
}
