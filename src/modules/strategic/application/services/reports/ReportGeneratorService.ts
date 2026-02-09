/**
 * Application Service: ReportGeneratorService
 * Orquestra geração de relatórios em PDF
 * 
 * @module strategic/application/services/reports
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '../../../infrastructure/di/tokens';
import type { IKPIRepository } from '../../../domain/ports/output/IKPIRepository';
import type { IStrategicGoalRepository } from '../../../domain/ports/output/IStrategicGoalRepository';
import type { IActionPlanRepository } from '../../../domain/ports/output/IActionPlanRepository';
import type { IApprovalHistoryRepository } from '../../../domain/ports/output/IApprovalHistoryRepository';
import { ReportPdfGenerator, type ReportHeader, type ReportSection } from '../../../infrastructure/pdf/ReportPdfGenerator';

export type ReportType = 'BSC_COMPLETE' | 'PERFORMANCE' | 'APPROVALS';

export interface GenerateReportInput {
  type: ReportType;
  period: {
    from: Date;
    to: Date;
  };
  options?: {
    includeCharts?: boolean;
    includeComments?: boolean;
    orientation?: 'portrait' | 'landscape';
  };
}

export interface GenerateReportOutput {
  buffer: Buffer;
  filename: string;
  generatedAt: Date;
}

@injectable()
export class ReportGeneratorService {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.ApprovalHistoryRepository)
    private readonly approvalRepository: IApprovalHistoryRepository
  ) {}

  async generateReport(
    input: GenerateReportInput,
    context: TenantContext
  ): Promise<Result<GenerateReportOutput, string>> {
    try {
      // Validar contexto
      if (!context.organizationId || !context.branchId) {
        return Result.fail('Contexto de organização/filial inválido');
      }

      let buffer: Buffer;
      let filename: string;

      switch (input.type) {
        case 'BSC_COMPLETE':
          buffer = await this.generateBSCReport(input, context);
          filename = `relatorio_bsc_${this.formatDate(new Date())}.pdf`;
          break;
        case 'PERFORMANCE':
          buffer = await this.generatePerformanceReport(input, context);
          filename = `relatorio_desempenho_${this.formatDate(new Date())}.pdf`;
          break;
        case 'APPROVALS':
          buffer = await this.generateApprovalsReport(input, context);
          filename = `relatorio_aprovacoes_${this.formatDate(new Date())}.pdf`;
          break;
        default:
          return Result.fail(`Tipo de relatório não suportado: ${input.type}`);
      }

      return Result.ok({
        buffer,
        filename,
        generatedAt: new Date(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar relatório';
      return Result.fail(message);
    }
  }

  /**
   * Gera relatório BSC Completo
   */
  private async generateBSCReport(
    input: GenerateReportInput,
    context: TenantContext
  ): Promise<Buffer> {
    const generator = new ReportPdfGenerator(input.options?.orientation);

    // Header
    const header: ReportHeader = {
      title: 'Relatório BSC Completo',
      subtitle: 'Balanced Scorecard - Todas as Perspectivas',
      organization: 'Organização', // TODO: Buscar nome real
      branch: 'Filial', // TODO: Buscar nome real
      period: this.formatPeriod(input.period.from, input.period.to),
    };
    generator.addHeader(header);

    // Buscar dados
    const { items: kpis } = await this.kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    const { items: goals } = await this.goalRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    // Seção: Summary Executivo
    const greenCount = kpis.filter((k) => k.status === 'GREEN').length;
    const yellowCount = kpis.filter((k) => k.status === 'YELLOW').length;
    const redCount = kpis.filter((k) => k.status === 'RED').length;

    generator.addSection({
      title: 'Summary Executivo',
      content: {
        type: 'table',
        headers: ['Métrica', 'Valor'],
        rows: [
          ['Total de KPIs', kpis.length.toString()],
          ['KPIs no Alvo (Verde)', `${greenCount} (${Math.round((greenCount / kpis.length) * 100)}%)`],
          ['KPIs em Atenção (Amarelo)', `${yellowCount} (${Math.round((yellowCount / kpis.length) * 100)}%)`],
          ['KPIs Críticos (Vermelho)', `${redCount} (${Math.round((redCount / kpis.length) * 100)}%)`],
          ['Total de Metas Estratégicas', goals.length.toString()],
        ],
      },
    });

    // Seção: KPIs por Perspectiva
    const perspectives = ['Financeira', 'Clientes', 'Processos Internos', 'Aprendizado e Crescimento'];
    
    for (const perspective of perspectives) {
      // Mock: distribuir KPIs por perspectiva (TODO: buscar perspective real da Goal)
      const perspectiveKpis = kpis.slice(0, Math.min(10, kpis.length));

      if (perspectiveKpis.length > 0) {
        generator.addSection({
          title: `Perspectiva: ${perspective}`,
          content: {
            type: 'table',
            headers: ['Código', 'Nome', 'Atual', 'Meta', 'Status', '% Ating.'],
            rows: perspectiveKpis.map((kpi) => [
              kpi.code,
              kpi.name.substring(0, 40),
              `${kpi.currentValue.toFixed(1)} ${kpi.unit}`,
              `${kpi.targetValue.toFixed(1)} ${kpi.unit}`,
              kpi.status === 'GREEN' ? '🟢' : kpi.status === 'YELLOW' ? '🟡' : '🔴',
              `${Math.round((kpi.currentValue / kpi.targetValue) * 100)}%`,
            ]),
          },
        });
      }
    }

    // Seção: Metas Estratégicas
    if (goals.length > 0) {
      generator.addSection({
        title: 'Metas Estratégicas',
        content: {
          type: 'table',
          headers: ['Código', 'Descrição', 'Prazo', 'Progresso', 'Status'],
          rows: goals.map((goal) => [
            goal.code,
            goal.description.substring(0, 50),
            goal.startDate.toLocaleDateString('pt-BR'), // TODO: calcular targetDate baseado em targetMonths
            `${Math.round(goal.progress)}%`,
            goal.status.value,
          ]),
        },
      });
    }

    return generator.generate();
  }

  /**
   * Gera relatório de Desempenho (Top 10 melhores/piores)
   */
  private async generatePerformanceReport(
    input: GenerateReportInput,
    context: TenantContext
  ): Promise<Buffer> {
    const generator = new ReportPdfGenerator(input.options?.orientation);

    // Header
    const header: ReportHeader = {
      title: 'Relatório de Desempenho',
      subtitle: 'Top 10 KPIs - Melhores e Piores Desempenhos',
      organization: 'Organização',
      branch: 'Filial',
      period: this.formatPeriod(input.period.from, input.period.to),
    };
    generator.addHeader(header);

    // Buscar KPIs
    const { items: allKpis } = await this.kpiRepository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page: 1,
      pageSize: 500,
    });

    // Calcular performance (% de atingimento)
    interface KPIWithPerformance {
      id: string;
      code: string;
      name: string;
      currentValue: number;
      targetValue: number;
      unit: string;
      status: 'GREEN' | 'YELLOW' | 'RED';
      performance: number;
    }

    const kpisWithPerformance: KPIWithPerformance[] = allKpis.map((kpi) => ({
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      currentValue: kpi.currentValue,
      targetValue: kpi.targetValue,
      unit: kpi.unit,
      status: kpi.status,
      performance: kpi.targetValue > 0 ? (kpi.currentValue / kpi.targetValue) * 100 : 0,
    }));

    // Top 10 melhores
    const topPerformers = [...kpisWithPerformance]
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 10);

    generator.addSection({
      title: 'Top 10 Melhores Desempenhos',
      content: {
        type: 'table',
        headers: ['#', 'Código', 'Nome', 'Atual', 'Meta', '% Ating.', 'Status'],
        rows: topPerformers.map((kpi, index) => [
          `${index + 1}º`,
          kpi.code,
          kpi.name.substring(0, 30),
          `${kpi.currentValue.toFixed(1)} ${kpi.unit}`,
          `${kpi.targetValue.toFixed(1)} ${kpi.unit}`,
          `${Math.round(kpi.performance)}%`,
          kpi.status === 'GREEN' ? '🟢' : kpi.status === 'YELLOW' ? '🟡' : '🔴',
        ]),
        theme: 'grid',
      },
    });

    // Top 10 piores
    const bottomPerformers = [...kpisWithPerformance]
      .sort((a, b) => a.performance - b.performance)
      .slice(0, 10);

    generator.addSection({
      title: 'Top 10 Piores Desempenhos',
      content: {
        type: 'table',
        headers: ['#', 'Código', 'Nome', 'Atual', 'Meta', '% Ating.', 'Status'],
        rows: bottomPerformers.map((kpi, index) => [
          `${index + 1}º`,
          kpi.code,
          kpi.name.substring(0, 30),
          `${kpi.currentValue.toFixed(1)} ${kpi.unit}`,
          `${kpi.targetValue.toFixed(1)} ${kpi.unit}`,
          `${Math.round(kpi.performance)}%`,
          kpi.status === 'GREEN' ? '🟢' : kpi.status === 'YELLOW' ? '🟡' : '🔴',
        ]),
        theme: 'grid',
      },
    });

    // Resumo estatístico
    const avgPerformance = kpisWithPerformance.reduce((sum, k) => sum + k.performance, 0) / kpisWithPerformance.length;
    
    generator.addSection({
      title: 'Análise Estatística',
      content: {
        type: 'table',
        headers: ['Métrica', 'Valor'],
        rows: [
          ['Média de Atingimento', `${Math.round(avgPerformance)}%`],
          ['Melhor Performance', `${Math.round(topPerformers[0]?.performance || 0)}%`],
          ['Pior Performance', `${Math.round(bottomPerformers[0]?.performance || 0)}%`],
          ['KPIs Acima da Média', kpisWithPerformance.filter((k) => k.performance > avgPerformance).length.toString()],
          ['KPIs Abaixo da Média', kpisWithPerformance.filter((k) => k.performance < avgPerformance).length.toString()],
        ],
      },
    });

    return generator.generate();
  }

  /**
   * Gera relatório de Aprovações
   */
  private async generateApprovalsReport(
    input: GenerateReportInput,
    context: TenantContext
  ): Promise<Buffer> {
    const generator = new ReportPdfGenerator(input.options?.orientation);

    // Header
    const header: ReportHeader = {
      title: 'Relatório de Aprovações',
      subtitle: 'Histórico de Aprovações e Análise de Gargalos',
      organization: 'Organização',
      branch: 'Filial',
      period: this.formatPeriod(input.period.from, input.period.to),
    };
    generator.addHeader(header);

    // Buscar histórico de aprovações
    const approvals = await this.approvalRepository.findByPeriod(
      input.period.from,
      input.period.to,
      context.organizationId,
      context.branchId
    );

    // Calcular métricas
    const totalApprovals = approvals.length;
    const approved = approvals.filter((a) => a.action === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.action === 'REJECTED').length;
    const pending = totalApprovals - approved - rejected;

    // Calcular tempo médio
    const approvalTimes = approvals
      .filter((a) => a.action === 'APPROVED')
      .map((a) => {
        // Mock: calcular tempo desde criação (TODO: usar campo real createdAt vs approvedAt)
        return 2; // dias
      });
    const avgTime = approvalTimes.length > 0
      ? approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length
      : 0;

    // Summary
    generator.addSection({
      title: 'Summary de Aprovações',
      content: {
        type: 'table',
        headers: ['Métrica', 'Valor'],
        rows: [
          ['Total de Solicitações', totalApprovals.toString()],
          ['Aprovadas', `${approved} (${Math.round((approved / totalApprovals) * 100)}%)`],
          ['Rejeitadas', `${rejected} (${Math.round((rejected / totalApprovals) * 100)}%)`],
          ['Pendentes', `${pending} (${Math.round((pending / totalApprovals) * 100)}%)`],
          ['Tempo Médio de Aprovação', `${avgTime.toFixed(1)} dias`],
        ],
      },
    });

    // Histórico recente
    generator.addSection({
      title: 'Histórico de Aprovações (Últimas 20)',
      content: {
        type: 'table',
        headers: ['Data', 'Tipo', 'Entidade', 'Aprovador', 'Ação', 'Comentário'],
        rows: approvals.slice(0, 20).map((a) => [
          a.createdAt.toLocaleDateString('pt-BR'),
          'Strategy',
          a.strategyId.substring(0, 8),
          a.actorUserId.toString(),
          a.action === 'APPROVED' ? '✅' : a.action === 'REJECTED' ? '❌' : '⏳',
          (a.comments || '-').substring(0, 30),
        ]),
      },
    });

    // Análise de gargalos (por aprovador)
    const approvalsByUser = approvals.reduce((acc, a) => {
      const key = a.actorUserId.toString();
      if (!acc[key]) {
        acc[key] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      acc[key].total++;
      if (a.action === 'APPROVED') acc[key].approved++;
      if (a.action === 'REJECTED') acc[key].rejected++;
      return acc;
    }, {} as Record<string, { total: number; approved: number; rejected: number; pending: number }>);

    const userStats = Object.entries(approvalsByUser)
      .map(([user, stats]) => ({
        user,
        ...stats,
        approvalRate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    generator.addSection({
      title: 'Análise por Aprovador (Top 10)',
      content: {
        type: 'table',
        headers: ['Aprovador', 'Total', 'Aprovadas', 'Rejeitadas', 'Taxa Aprov.'],
        rows: userStats.map((stat) => [
          stat.user,
          stat.total.toString(),
          stat.approved.toString(),
          stat.rejected.toString(),
          `${Math.round(stat.approvalRate)}%`,
        ]),
      },
    });

    return generator.generate();
  }

  /**
   * Formata período para exibição
   */
  private formatPeriod(from: Date, to: Date): string {
    const fromStr = from.toLocaleDateString('pt-BR');
    const toStr = to.toLocaleDateString('pt-BR');
    return `${fromStr} a ${toStr}`;
  }

  /**
   * Formata data para nome de arquivo
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
