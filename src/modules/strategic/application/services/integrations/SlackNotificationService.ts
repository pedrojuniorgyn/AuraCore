/**
 * Application Service: SlackNotificationService
 * Envia notificações para Slack sobre eventos estratégicos
 * 
 * @module strategic/application/services/integrations
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { sendSlackMessage, formatSlackNotification, type MessageFormat } from '@/lib/integrations/slack';
import type { IntegrationEventType, IntegrationPayload } from '@/lib/integrations/integration-types';
import { STRATEGIC_TOKENS } from '../../../infrastructure/di/tokens';
import type { IKPIRepository } from '../../../domain/ports/output/IKPIRepository';
import type { IActionPlanRepository } from '../../../domain/ports/output/IActionPlanRepository';

export interface SlackNotificationInput {
  webhookUrl: string;
  eventType: IntegrationEventType;
  data: Record<string, unknown>;
  messageFormat?: MessageFormat;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  sentAt: Date;
}

@injectable()
export class SlackNotificationService {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository
  ) {}

  /**
   * Envia notificação para Slack
   */
  async sendNotification(
    input: SlackNotificationInput
  ): Promise<Result<NotificationResult, string>> {
    try {
      // Validar webhook URL
      if (!input.webhookUrl || !input.webhookUrl.startsWith('https://hooks.slack.com/')) {
        return Result.fail('Webhook URL inválido');
      }

      // Formatar mensagem
      const message = formatSlackNotification(
        input.eventType,
        input.data,
        input.messageFormat || 'detailed'
      );

      // Enviar para Slack
      const response = await sendSlackMessage({
        webhookUrl: input.webhookUrl,
        message,
      });

      if (!response.success) {
        return Result.fail(response.error || 'Erro ao enviar notificação');
      }

      return Result.ok({
        success: true,
        sentAt: new Date(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao enviar notificação: ${message}`);
    }
  }

  /**
   * Envia notificação sobre KPI crítico
   */
  async notifyKPICritical(
    kpiId: string,
    webhookUrl: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<NotificationResult, string>> {
    try {
      // Buscar KPI
      const kpi = await this.kpiRepository.findById(kpiId, organizationId, branchId);
      if (!kpi) {
        return Result.fail('KPI não encontrado');
      }

      // Montar payload
      const data = {
        description: `KPI "${kpi.name}" (${kpi.code}) está em situação crítica`,
        message: `Valor atual: ${kpi.currentValue} ${kpi.unit} | Meta: ${kpi.targetValue} ${kpi.unit}`,
        link: `${process.env.NEXT_PUBLIC_APP_URL}/strategic/kpis/${kpi.id}`,
        kpiCode: kpi.code,
        kpiName: kpi.name,
        currentValue: `${kpi.currentValue} ${kpi.unit}`,
        targetValue: `${kpi.targetValue} ${kpi.unit}`,
        status: kpi.status,
      };

      return this.sendNotification({
        webhookUrl,
        eventType: 'kpi.critical',
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(message);
    }
  }

  /**
   * Envia notificação sobre plano de ação atrasado
   */
  async notifyActionPlanOverdue(
    planId: string,
    webhookUrl: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<NotificationResult, string>> {
    try {
      // Buscar plano
      const plan = await this.actionPlanRepository.findById(planId, organizationId, branchId);
      if (!plan) {
        return Result.fail('Plano de ação não encontrado');
      }

      const daysOverdue = Math.ceil(
        (new Date().getTime() - plan.whenEnd.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Montar payload
      const data = {
        description: `Plano de Ação "${plan.what.substring(0, 50)}" está atrasado`,
        message: `${daysOverdue} dias de atraso | Responsável: ${plan.who}`,
        link: `${process.env.NEXT_PUBLIC_APP_URL}/strategic/action-plans/${plan.id}`,
        planCode: plan.code,
        what: plan.what.substring(0, 100),
        who: plan.who,
        daysOverdue: daysOverdue.toString(),
        status: plan.status,
      };

      return this.sendNotification({
        webhookUrl,
        eventType: 'action_plan.overdue',
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(message);
    }
  }

  /**
   * Envia notificação sobre meta atingida
   */
  async notifyTargetAchieved(
    kpiId: string,
    webhookUrl: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<NotificationResult, string>> {
    try {
      const kpi = await this.kpiRepository.findById(kpiId, organizationId, branchId);
      if (!kpi) {
        return Result.fail('KPI não encontrado');
      }

      const data = {
        description: `🎯 Meta do KPI "${kpi.name}" foi atingida!`,
        message: `Parabéns! Valor: ${kpi.currentValue} ${kpi.unit}`,
        link: `${process.env.NEXT_PUBLIC_APP_URL}/strategic/kpis/${kpi.id}`,
        kpiCode: kpi.code,
        kpiName: kpi.name,
        currentValue: `${kpi.currentValue} ${kpi.unit}`,
        targetValue: `${kpi.targetValue} ${kpi.unit}`,
      };

      return this.sendNotification({
        webhookUrl,
        eventType: 'kpi.target_achieved',
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(message);
    }
  }

  /**
   * Processa evento genérico de integração
   */
  async processIntegrationEvent(
    payload: IntegrationPayload,
    webhookUrl: string
  ): Promise<Result<NotificationResult, string>> {
    return this.sendNotification({
      webhookUrl,
      eventType: payload.event as IntegrationEventType,
      data: payload.data,
    });
  }
}
