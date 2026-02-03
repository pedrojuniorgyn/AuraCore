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
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';
import type { NotificationType } from '@/shared/infrastructure/notifications/types';

export interface AlertConfig {
  kpiCriticalThreshold: number;
  kpiWarningThreshold: number;
  varianceUnfavorableThreshold: number;
  overdueDaysWarning: number;
  overdueDaysCritical: number;
  staleDaysThreshold: number;
  // Configurações de notificação
  emailEnabled?: boolean;
  webhookEnabled?: boolean;
  inAppEnabled?: boolean;
  webhookUrl?: string;
  emailRecipients?: string[];
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
    private actionPlanRepository: IActionPlanRepository,
    @inject('NotificationService')
    private notificationService: NotificationService
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

    // Enviar notificações para cada alerta criado
    const effectiveConfig = mergeWithDefaults(config);
    for (const alert of allAlerts) {
      await this.sendNotifications(alert, effectiveConfig, organizationId, branchId);
    }

    return Result.ok({
      created: allAlerts.length,
      alerts: allAlerts,
    });
  }

  /**
   * Envia notificações (email, webhook, in-app) para um alerta
   */
  private async sendNotifications(
    alert: Alert,
    config: AlertConfig,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    // In-App Notification (sempre ativa por padrão)
    if (config.inAppEnabled !== false) {
      const notificationType: NotificationType = 
        alert.severity === 'CRITICAL' ? 'ERROR' :
        alert.severity === 'HIGH' ? 'WARNING' :
        'INFO';

      await this.notificationService.createInAppNotification({
        organizationId,
        branchId,
        userId: 1, // TODO: Pegar do contexto ou configuração
        type: notificationType,
        event: alert.alertType as never,
        title: alert.title,
        message: alert.message,
        data: {
          alertId: alert.id,
          entityType: alert.entityType,
          entityId: alert.entityId,
          severity: alert.severity,
        },
        actionUrl: `/strategic/dashboard?alert=${alert.id}`,
      });
    }

    // Email Notification
    if (config.emailEnabled && config.emailRecipients && config.emailRecipients.length > 0) {
      const template = this.getEmailTemplate(alert.alertType);
      const variables = this.getEmailVariables(alert);

      await this.notificationService.sendEmail({
        to: config.emailRecipients,
        subject: `🔔 ${alert.title}`,
        body: alert.message,
        template,
        variables,
      });
    }

    // Webhook Notification
    if (config.webhookEnabled && config.webhookUrl) {
      await this.notificationService.sendWebhook({
        url: config.webhookUrl,
        payload: {
          type: alert.alertType,
          severity: alert.severity,
          entity: {
            type: alert.entityType,
            id: alert.entityId,
            name: alert.entityName,
          },
          title: alert.title,
          message: alert.message,
          createdAt: alert.createdAt.toISOString(),
        },
        retryAttempts: 3,
      });
    }
  }

  /**
   * Determina qual template de email usar baseado no tipo de alerta
   */
  private getEmailTemplate(alertType: string): string {
    switch (alertType) {
      case 'KPI_CRITICAL':
      case 'KPI_WARNING':
        return 'alert-kpi-critical';
      case 'ACTION_PLAN_OVERDUE':
      case 'ACTION_PLAN_STALE':
        return 'alert-overdue';
      default:
        return 'alert-kpi-critical'; // fallback
    }
  }

  /**
   * Extrai variáveis do alerta para substituir no template de email
   */
  private getEmailVariables(alert: Alert): Record<string, string | number> {
    // Usar currentValue e thresholdValue da entity Alert
    const data: Record<string, unknown> = {
      currentValue: alert.currentValue,
      thresholdValue: alert.thresholdValue,
      entityName: alert.entityName,
      entityId: alert.entityId,
    };

    return {
      kpiName: String(data.kpiName || alert.entityName || 'KPI'),
      percentage: Number(data.percentage || data.achievementPercent || 0),
      threshold: Number(data.threshold || 70),
      target: String(data.target || 'N/A'),
      actual: String(data.actual || 'N/A'),
      variance: String(data.variance || 'N/A'),
      date: new Date().toLocaleDateString('pt-BR'),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/strategic/dashboard`,
      planName: String(data.planName || alert.entityName || 'Plano de Ação'),
      daysOverdue: Number(data.daysOverdue || 0),
      what: String(data.what || 'N/A'),
      who: String(data.who || 'N/A'),
      dueDate: String(data.dueDate || 'N/A'),
      where: String(data.whereLocation || 'N/A'),
      actionPlanUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/strategic/action-plans/${alert.entityId}`,
    };
  }
}
