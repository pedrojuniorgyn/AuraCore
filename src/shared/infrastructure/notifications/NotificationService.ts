/**
 * Service: NotificationService
 * Serviço centralizado para envio de notificações (Email, Webhook, InApp)
 * 
 * @module shared/infrastructure/notifications
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type {
  EmailParams,
  WebhookParams,
  InAppNotificationParams,
} from './types';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class NotificationService {
  /**
   * Envia email usando template HTML
   * 
   * NOTA: Requer configuração de SMTP ou Resend
   * Para desenvolvimento, loga no console
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

      // TODO: Integrar com serviço de email real (Resend, SendGrid, SMTP)
      // Por ora, logar no console para desenvolvimento
      console.log('📧 Email enviado:', {
        to,
        subject,
        bodyPreview: emailBody.substring(0, 100) + '...',
        hasTemplate: Boolean(template),
      });

      // PRODUÇÃO: Descomentar quando configurar serviço de email
      /*
      const emailService = process.env.EMAIL_SERVICE; // 'resend' | 'smtp'
      
      if (emailService === 'resend') {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@auracore.com.br',
          to,
          subject,
          html: emailBody,
        });
      } else if (emailService === 'smtp') {
        // Implementar SMTP com nodemailer
      }
      */

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
