/**
 * Service: NotificationService
 * Serviço centralizado para envio de notificações (Email via Resend, Webhook, InApp)
 * 
 * @module shared/infrastructure/notifications
 * @see TASK01-RESEND-NOTIFICATIONS
 */
import { injectable } from 'tsyringe';
import { Resend } from 'resend';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type {
  EmailParams,
  WebhookParams,
  InAppNotificationParams,
  ApprovalPendingEmailParams,
  ApprovalDecisionEmailParams,
  KpiAlertEmailParams,
  DelegationEmailParams,
  EmailSendResult,
} from './types';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class NotificationService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private baseUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'AuraCore <noreply@auracore.cloud>';
    this.baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  }

  /**
   * Verifica se Resend está configurado
   */
  isEmailEnabled(): boolean {
    return this.resend !== null;
  }

  /**
   * Envia email usando Resend API
   * 
   * @param to Destinatário(s)
   * @param subject Assunto
   * @param html Conteúdo HTML
   * @returns Resultado com messageId ou erro
   */
  async sendEmailViaResend(
    to: string | string[],
    subject: string,
    html: string
  ): Promise<EmailSendResult> {
    if (!this.resend) {
      console.log('📧 [DEV] Email (Resend não configurado):', { to, subject });
      return { success: true, messageId: 'dev-mode' };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (response.error) {
        console.error('❌ Resend API error:', response.error);
        return { success: false, error: response.error.message };
      }

      console.log('✅ Email enviado via Resend:', { 
        messageId: response.data?.id, 
        to 
      });
      return { success: true, messageId: response.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro ao enviar email:', message);
      return { success: false, error: message };
    }
  }

  // ========================================
  // EMAILS ESPECIALIZADOS (WORKFLOW)
  // ========================================

  /**
   * Envia email de aprovação pendente para aprovador
   */
  async sendApprovalPendingEmail(params: ApprovalPendingEmailParams): Promise<EmailSendResult> {
    const html = this.buildApprovalPendingTemplate(params);
    return this.sendEmailViaResend(
      params.to,
      `⏳ Nova aprovação pendente - ${params.strategyTitle}`,
      html
    );
  }

  /**
   * Envia email de decisão de aprovação para submitter
   */
  async sendApprovalDecisionEmail(params: ApprovalDecisionEmailParams): Promise<EmailSendResult> {
    const html = this.buildApprovalDecisionTemplate(params);
    const emoji = params.status === 'approved' ? '✅' : params.status === 'rejected' ? '❌' : '🔄';
    const statusLabel = params.status === 'approved' ? 'aprovada' : 
                        params.status === 'rejected' ? 'rejeitada' : 'requer alterações';
    
    return this.sendEmailViaResend(
      params.to,
      `${emoji} Estratégia ${statusLabel} - ${params.strategyTitle}`,
      html
    );
  }

  /**
   * Envia email de alerta de KPI fora da meta
   */
  async sendKpiAlertEmail(params: KpiAlertEmailParams): Promise<EmailSendResult> {
    const html = this.buildKpiAlertTemplate(params);
    return this.sendEmailViaResend(
      params.to,
      `🚨 Alerta: KPI ${params.kpiName} fora da meta`,
      html
    );
  }

  /**
   * Envia email de delegação de aprovação
   */
  async sendDelegationEmail(params: DelegationEmailParams): Promise<EmailSendResult> {
    const html = this.buildDelegationTemplate(params);
    return this.sendEmailViaResend(
      params.to,
      `👤 Aprovação delegada - ${params.strategyTitle}`,
      html
    );
  }

  // ========================================
  // TEMPLATES HTML
  // ========================================

  private buildApprovalPendingTemplate(params: ApprovalPendingEmailParams): string {
    // Usar toLocaleString() para incluir hora e minuto (toLocaleDateString ignora opções de hora)
    const formattedDate = new Date(params.submittedAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .info-box { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .info-box p { margin: 8px 0; }
    .info-label { color: #666; font-size: 14px; }
    .info-value { font-weight: 600; color: #333; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .logo { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏳ Nova Aprovação Pendente</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${params.approverName}</strong>,</p>
      <p>Uma nova estratégia foi submetida para sua aprovação no AuraCore:</p>
      
      <div class="info-box">
        <p><span class="info-label">📋 Estratégia:</span> <span class="info-value">${params.strategyTitle}</span></p>
        <p><span class="info-label">🔢 Código:</span> <span class="info-value">${params.strategyCode}</span></p>
        <p><span class="info-label">👤 Submetida por:</span> <span class="info-value">${params.submittedBy}</span></p>
        <p><span class="info-label">📅 Data:</span> <span class="info-value">${formattedDate}</span></p>
      </div>

      <p style="text-align: center;">
        <a href="${params.approvalUrl}" class="cta-button">
          Aprovar ou Rejeitar
        </a>
      </p>

      <p style="font-size: 13px; color: #888; margin-top: 32px;">
        Este email foi enviado automaticamente pelo AuraCore. Por favor, não responda.
      </p>
    </div>
    <div class="footer">
      <div class="logo">🎯 AuraCore</div>
      © ${new Date().getFullYear()} AuraCore ERP. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`.trim();
  }

  private buildApprovalDecisionTemplate(params: ApprovalDecisionEmailParams): string {
    const isApproved = params.status === 'approved';
    const isRejected = params.status === 'rejected';
    const emoji = isApproved ? '✅' : isRejected ? '❌' : '🔄';
    const statusLabel = isApproved ? 'Aprovada' : isRejected ? 'Rejeitada' : 'Requer Alterações';
    const statusColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b';
    // Usar toLocaleString() para incluir hora e minuto (toLocaleDateString ignora opções de hora)
    const formattedDate = new Date(params.decisionAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: ${statusColor}; color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .info-box { background: #f8f9fa; border-left: 4px solid ${statusColor}; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .info-box p { margin: 8px 0; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} Estratégia ${statusLabel}</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${params.recipientName}</strong>,</p>
      <p>Sua estratégia foi <strong>${statusLabel.toLowerCase()}</strong>:</p>
      
      <div class="info-box">
        <p><strong>📋 Estratégia:</strong> ${params.strategyTitle}</p>
        <p><strong>🔢 Código:</strong> ${params.strategyCode}</p>
        <p><strong>👤 ${isApproved ? 'Aprovada' : isRejected ? 'Rejeitada' : 'Analisada'} por:</strong> ${params.decisionBy}</p>
        <p><strong>📅 Data:</strong> ${formattedDate}</p>
        ${params.comment ? `<p><strong>💬 Comentário:</strong> ${params.comment}</p>` : ''}
        ${params.reason ? `<p><strong>📝 Motivo:</strong> ${params.reason}</p>` : ''}
      </div>

      <p style="font-size: 13px; color: #888; margin-top: 32px;">
        Este email foi enviado automaticamente pelo AuraCore. Por favor, não responda.
      </p>
    </div>
    <div class="footer">
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">🎯 AuraCore</div>
      © ${new Date().getFullYear()} AuraCore ERP. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`.trim();
  }

  private buildKpiAlertTemplate(params: KpiAlertEmailParams): string {
    const varianceColor = params.variance < 0 ? '#ef4444' : '#10b981';
    const varianceSign = params.variance > 0 ? '+' : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .metric { text-align: center; padding: 30px; background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); border-radius: 12px; margin: 24px 0; }
    .metric-value { font-size: 48px; font-weight: bold; color: ${varianceColor}; }
    .metric-label { font-size: 14px; color: #666; margin-top: 8px; }
    .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .cta-button { display: inline-block; background: #dc2626; color: white !important; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Alerta de KPI</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${params.ownerName}</strong>,</p>
      <p>O KPI <strong>${params.kpiName}</strong> (${params.kpiCode}) está fora da meta:</p>
      
      <div class="metric">
        <div class="metric-label">VALOR ATUAL</div>
        <div class="metric-value">${params.currentValue.toFixed(2)} ${params.unit}</div>
        <div class="metric-label">Meta: ${params.targetValue.toFixed(2)} ${params.unit}</div>
      </div>

      <div class="alert-box">
        <p><strong>📊 Variação:</strong> <span style="color: ${varianceColor}; font-weight: bold;">${varianceSign}${params.variance.toFixed(2)}%</span></p>
        <p><strong>⚠️ Status:</strong> Fora da meta</p>
      </div>

      <p style="text-align: center;">
        <a href="${params.alertUrl}" class="cta-button">
          Ver Detalhes e Planos de Ação
        </a>
      </p>

      <p style="font-size: 13px; color: #888; margin-top: 32px;">
        Este email foi enviado automaticamente pelo AuraCore. Por favor, não responda.
      </p>
    </div>
    <div class="footer">
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">🎯 AuraCore</div>
      © ${new Date().getFullYear()} AuraCore ERP. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`.trim();
  }

  private buildDelegationTemplate(params: DelegationEmailParams): string {
    const expiresText = params.expiresAt 
      ? `até ${new Date(params.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`
      : 'sem prazo definido';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👤 Aprovação Delegada</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${params.delegateName}</strong>,</p>
      <p><strong>${params.delegatorName}</strong> delegou a você a aprovação de uma estratégia:</p>
      
      <div class="info-box">
        <p><strong>📋 Estratégia:</strong> ${params.strategyTitle}</p>
        <p><strong>🔢 Código:</strong> ${params.strategyCode}</p>
        <p><strong>⏰ Válido:</strong> ${expiresText}</p>
      </div>

      <p style="text-align: center;">
        <a href="${params.delegationUrl}" class="cta-button">
          Ver Estratégia
        </a>
      </p>

      <p style="font-size: 13px; color: #888; margin-top: 32px;">
        Este email foi enviado automaticamente pelo AuraCore. Por favor, não responda.
      </p>
    </div>
    <div class="footer">
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">🎯 AuraCore</div>
      © ${new Date().getFullYear()} AuraCore ERP. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`.trim();
  }

  // ========================================
  // MÉTODO LEGADO (mantido para compatibilidade)
  // ========================================

  /**
   * Envia email usando template HTML (método legado)
   * 
   * @deprecated Use sendEmailViaResend ou métodos especializados
   */
  async sendEmail(params: EmailParams): Promise<Result<void, string>> {
    try {
      const { to, subject, body, template, variables } = params;

      let emailBody = body;

      // Se template especificado, carregar e substituir variáveis
      if (template) {
        const templatePath = path.join(
          process.cwd(),
          'src/shared/infrastructure/notifications/templates',
          `${template}.html`
        );

        if (fs.existsSync(templatePath)) {
          emailBody = fs.readFileSync(templatePath, 'utf-8');

          // Substituir variáveis {{key}} pelos valores
          if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              emailBody = emailBody.replace(regex, String(value));
            });
          }
        }
      }

      // Usar Resend se configurado
      if (this.resend) {
        const result = await this.sendEmailViaResend(to, subject, emailBody);
        if (!result.success) {
          return Result.fail(result.error || 'Erro ao enviar email');
        }
        return Result.ok(undefined);
      }

      // Fallback: log no console em dev
      console.log('📧 [DEV] Email:', {
        to,
        subject,
        bodyPreview: emailBody.substring(0, 100) + '...',
        hasTemplate: Boolean(template),
      });

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao enviar email:', message);
      return Result.fail(`Falha ao enviar email: ${message}`);
    }
  }

  /**
   * Envia webhook HTTP POST com retry
   */
  async sendWebhook(params: WebhookParams): Promise<Result<void, string>> {
    const { url, payload, retryAttempts = 3, headers = {} } = params;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AuraCore-ERP/1.0',
            ...headers,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log(`🔔 Webhook enviado com sucesso para ${url}`);
          return Result.ok(undefined);
        }

        // Se não for a última tentativa, logar e tentar novamente
        if (attempt < retryAttempts) {
          console.warn(`Webhook falhou (tentativa ${attempt}/${retryAttempts}), status: ${response.status}`);
          // Aguardar antes de retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        } else {
          return Result.fail(`Webhook falhou após ${retryAttempts} tentativas. Status: ${response.status}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        
        if (attempt < retryAttempts) {
          console.warn(`Webhook erro (tentativa ${attempt}/${retryAttempts}):`, message);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        } else {
          return Result.fail(`Webhook falhou após ${retryAttempts} tentativas: ${message}`);
        }
      }
    }

    return Result.fail('Webhook falhou');
  }

  /**
   * Cria notificação in-app no banco de dados
   */
  /**
   * Cria notificação in-app para usuário
   * 
   * @param params Parâmetros da notificação
   * @returns Result vazio (success) ou erro
   * 
   * NOTA: userId pode ser number ou string. Schema do banco requer string (nvarchar),
   * então conversão é aplicada se necessário.
   */
  async createInAppNotification(
    params: InAppNotificationParams
  ): Promise<Result<void, string>> {
    try {
      const { organizationId, branchId, userId, type, event, title, message, data, actionUrl } = params;

      // Schema usa nvarchar para userId, então converter para string
      const userIdString = typeof userId === 'string' ? userId : String(userId);

      // REPO-005: branchId NUNCA pode ser null (multi-tenancy obrigatório)
      await db.insert(notifications).values({
        organizationId,
        branchId, // Sem fallback || null - validação deve garantir valor
        userId: userIdString,
        type,
        event,
        title,
        message: message || null,
        data: data ? JSON.stringify(data) : null,
        actionUrl: actionUrl || null,
        isRead: 0,
      });

      console.log(`📬 Notificação in-app criada para userId=${userIdString}, type=${type}`);

      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao criar notificação in-app:', errorMessage);
      return Result.fail(`Falha ao criar notificação: ${errorMessage}`);
    }
  }

  /**
   * Marca notificação como lida
   * 
   * REPO-005: SEMPRE filtra por organizationId + branchId + userId
   * para garantir isolamento multi-tenant
   * 
   * @param notificationId ID da notificação
   * @param userId ID do usuário (string ou number)
   * @param organizationId ID da organização
   * @param branchId ID da filial
   */
  async markAsRead(
    notificationId: number,
    userId: number | string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      const userIdString = String(userId);

      // REPO-005: SEMPRE filtrar por multi-tenancy (organizationId + branchId + userId)
      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userIdString),
            eq(notifications.organizationId, organizationId),
            eq(notifications.branchId, branchId)
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao marcar notificação como lida: ${message}`);
    }
  }

  /**
   * Marca TODAS as notificações não lidas do usuário como lidas
   * 
   * Esta é uma operação bulk que atualiza todas as notificações em uma única query,
   * evitando o problema N+1 de marcar cada notificação individualmente.
   * 
   * REPO-005: SEMPRE filtra por organizationId + branchId + userId
   * para garantir isolamento multi-tenant
   * 
   * @param userId ID do usuário (string ou number)
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Result com número de notificações atualizadas ou erro
   */
  async markAllAsRead(
    userId: number | string,
    organizationId: number,
    branchId: number
  ): Promise<Result<{ count: number }, string>> {
    try {
      const userIdString = String(userId);

      // REPO-005: SEMPRE filtrar por multi-tenancy (organizationId + branchId + userId)
      // Marcar todas notificações não lidas do usuário como lidas em uma única query
      const result = await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userIdString),
            eq(notifications.organizationId, organizationId),
            eq(notifications.branchId, branchId),
            eq(notifications.isRead, 0) // Apenas não lidas
          )
        );

      // SQL Server retorna rowsAffected
      const count = (result as unknown as { rowsAffected: number[] })?.rowsAffected?.[0] ?? 0;

      return Result.ok({ count });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao marcar todas notificações como lidas: ${message}`);
    }
  }

  /**
   * Busca notificações não lidas de um usuário
   * 
   * @param userId ID do usuário (number ou string)
   * @param organizationId ID da organização
   * @param branchId ID da filial (obrigatório para isolamento multi-tenant)
   * @param limit Limite de resultados (padrão: 50, máx: 200)
   * @returns Result com lista de notificações ou erro
   * 
   * NOTA: API anterior permitia ?limit=N query param (1-200).
   * Este parâmetro restaura essa funcionalidade.
   * 
   * @see REPO-005: TODA query filtra organizationId + branchId
   */
  async getUnreadNotifications(
    userId: number | string,
    organizationId: number,
    branchId: number,
    limit: number = 50
  ): Promise<Result<unknown[], string>> {
    try {
      // Validar e clampar limit (1-200)
      const clampedLimit = Math.max(1, Math.min(200, limit));

      // Schema usa nvarchar para userId
      const userIdString = typeof userId === 'string' ? userId : String(userId);

      // MSSQL: Usar .orderBy().offset().fetch() ao invés de .limit()
      // .limit() NÃO EXISTE em runtime no Drizzle MSSQL
      // @see LC-BUG-026 - 03/02/2026
      // @see src/lib/db/query-helpers.ts (documentação HOTFIX Sprint S3 v5)
      const query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userIdString),
            eq(notifications.organizationId, organizationId),
            eq(notifications.branchId, branchId), // REPO-005: filtro obrigatório
            eq(notifications.isRead, 0)
          )
        )
        .orderBy(desc(notifications.createdAt));

      // MSSQL paginação: .offset(0).fetch(n) - pattern correto para SQL Server
      type QueryWithOffsetFetch = { offset(n: number): { fetch(m: number): Promise<unknown[]> } };
      const notificationsList = await (query as unknown as QueryWithOffsetFetch).offset(0).fetch(clampedLimit);

      return Result.ok(notificationsList);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao buscar notificações: ${message}`);
    }
  }
}
