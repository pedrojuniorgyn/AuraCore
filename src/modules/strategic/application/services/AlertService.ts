/**
 * Service: AlertService
 * Serviço de verificação e criação de alertas automáticos seguindo DDD
 *
 * @module strategic/application/services
 */
import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { Alert, type AlertSeverity } from '../../domain/entities/Alert';
import type { IAlertRepository } from '../../domain/ports/output/IAlertRepository';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface AlertConfig {
  kpiCriticalThreshold: number;
  kpiWarningThreshold: number;
  varianceUnfavorableThreshold: number;
  overdueDaysWarning: number;
  overdueDaysCritical: number;
  staleDaysThreshold: number;
}

export type PartialAlertConfig = Partial<AlertConfig>;

const DEFAULT_CONFIG: AlertConfig = {
  kpiCriticalThreshold: 70,
  kpiWarningThreshold: 85,
  varianceUnfavorableThreshold: 15,
  overdueDaysWarning: 3,
  overdueDaysCritical: 7,
  staleDaysThreshold: 14,
};

/**
 * Mescla configuração parcial com valores padrão
 */
function mergeWithDefaults(config?: PartialAlertConfig): AlertConfig {
  return {
    kpiCriticalThreshold: config?.kpiCriticalThreshold ?? DEFAULT_CONFIG.kpiCriticalThreshold,
    kpiWarningThreshold: config?.kpiWarningThreshold ?? DEFAULT_CONFIG.kpiWarningThreshold,
    varianceUnfavorableThreshold: config?.varianceUnfavorableThreshold ?? DEFAULT_CONFIG.varianceUnfavorableThreshold,
    overdueDaysWarning: config?.overdueDaysWarning ?? DEFAULT_CONFIG.overdueDaysWarning,
    overdueDaysCritical: config?.overdueDaysCritical ?? DEFAULT_CONFIG.overdueDaysCritical,
    staleDaysThreshold: config?.staleDaysThreshold ?? DEFAULT_CONFIG.staleDaysThreshold,
  };
}

@injectable()
export class AlertService {
  constructor(
    @inject(STRATEGIC_TOKENS.AlertRepository)
    private alertRepository: IAlertRepository,
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private actionPlanRepository: IActionPlanRepository
  ) {}

  /**
   * Verifica KPIs críticos e cria alertas
   */
  async checkKPIAlerts(
    organizationId: number,
    branchId: number,
    config?: PartialAlertConfig
  ): Promise<Result<Alert[], string>> {
    const alerts: Alert[] = [];
    const effectiveConfig = mergeWithDefaults(config);

    // Buscar todos os KPIs ativos
    const kpisResult = await this.kpiRepository.findMany({
      organizationId,
      branchId,
      page: 1,
      pageSize: 1000,
    });

    for (const kpi of kpisResult.items) {
      const percentage = kpi.achievementPercent;

      if (percentage !== null && percentage < effectiveConfig.kpiCriticalThreshold) {
        const severity: AlertSeverity = percentage < 50 ? 'CRITICAL' : 'HIGH';

        // Verificar se já existe alerta pendente para este KPI
        const existingAlert = await this.alertRepository.findByEntity(
          organizationId,
          branchId,
          'KPI',
          kpi.id,
          'KPI_CRITICAL'
        );

        if (!existingAlert) {
          const alertResult = Alert.create({
            organizationId,
            branchId,
            alertType: 'KPI_CRITICAL',
            severity,
            entityType: 'KPI',
            entityId: kpi.id,
            entityName: kpi.name,
            title: `KPI "${kpi.name}" em estado crítico`,
            message: `O KPI "${kpi.name}" está em ${percentage.toFixed(1)}%, abaixo do limite de ${effectiveConfig.kpiCriticalThreshold}%.`,
            currentValue: percentage,
            thresholdValue: effectiveConfig.kpiCriticalThreshold,
          });

          if (Result.isOk(alertResult)) {
            alerts.push(alertResult.value);
          }
        }
      }
    }

    return Result.ok(alerts);
  }

  /**
   * Verifica Action Plans atrasados e cria alertas
   */
  async checkOverdueAlerts(
    organizationId: number,
    branchId: number,
    config?: PartialAlertConfig
  ): Promise<Result<Alert[], string>> {
    const alerts: Alert[] = [];
    const effectiveConfig = mergeWithDefaults(config);
    const today = new Date();

    // Buscar action plans em andamento
    const plansResult = await this.actionPlanRepository.findMany({
      organizationId,
      branchId,
      status: 'IN_PROGRESS',
      page: 1,
      pageSize: 1000,
    });

    for (const plan of plansResult.items) {
      const dueDate = plan.whenEnd;

      if (dueDate && dueDate < today) {
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        let severity: AlertSeverity = 'LOW';
        if (daysOverdue >= effectiveConfig.overdueDaysCritical) {
          severity = 'CRITICAL';
        } else if (daysOverdue >= effectiveConfig.overdueDaysWarning) {
          severity = 'HIGH';
        }

        // Verificar se já existe alerta pendente para este Action Plan
        const existingAlert = await this.alertRepository.findByEntity(
          organizationId,
          branchId,
          'ACTION_PLAN',
          plan.id,
          'ACTION_PLAN_OVERDUE'
        );

        if (!existingAlert) {
          const alertResult = Alert.create({
            organizationId,
            branchId,
            alertType: 'ACTION_PLAN_OVERDUE',
            severity,
            entityType: 'ACTION_PLAN',
            entityId: plan.id,
            entityName: plan.what,
            title: `Action Plan "${plan.what}" está atrasado`,
            message: `O plano de ação "${plan.what}" está ${daysOverdue} dia(s) atrasado.`,
            currentValue: daysOverdue,
            thresholdValue: 0,
          });

          if (Result.isOk(alertResult)) {
            alerts.push(alertResult.value);
          }
        }
      }
    }

    return Result.ok(alerts);
  }

  /**
   * Executa todas as verificações de alertas
   */
  async runAllChecks(
    organizationId: number,
    branchId: number,
    config?: PartialAlertConfig
  ): Promise<Result<{ created: number; alerts: Alert[] }, string>> {
    const allAlerts: Alert[] = [];

    // Verificar KPIs críticos
    const kpiResult = await this.checkKPIAlerts(organizationId, branchId, config);
    if (Result.isOk(kpiResult)) {
      allAlerts.push(...kpiResult.value);
    }

    // Verificar Action Plans atrasados
    const overdueResult = await this.checkOverdueAlerts(organizationId, branchId, config);
    if (Result.isOk(overdueResult)) {
      allAlerts.push(...overdueResult.value);
    }

    // Persistir todos os novos alertas
    for (const alert of allAlerts) {
      await this.alertRepository.save(alert);
    }

    return Result.ok({
      created: allAlerts.length,
      alerts: allAlerts,
    });
  }
}
