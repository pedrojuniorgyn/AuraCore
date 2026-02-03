/**
 * Service: NotificationService
 * Serviço centralizado para envio de notificações (Email, Webhook, InApp)
 * 
 * @module shared/infrastructure/notifications
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { notificationTable } from './schemas/notification.schema';
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
  async createInAppNotification(
    params: InAppNotificationParams
  ): Promise<Result<void, string>> {
    try {
      const { organizationId, branchId, userId, type, event, title, message, data, actionUrl } = params;

      await db.insert(notificationTable).values({
        organizationId,
        branchId: branchId || null,
        userId: userId || null,
        type,
        event,
        title,
        message: message || null,
        data: data ? JSON.stringify(data) : null,
        actionUrl: actionUrl || null,
        isRead: false,
      });

      console.log(`📬 Notificação in-app criada para userId=${userId}, type=${type}`);

      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao criar notificação in-app:', errorMessage);
      return Result.fail(`Falha ao criar notificação: ${errorMessage}`);
    }
  }

  /**
   * Marca notificação como lida
   */
  async markAsRead(notificationId: number): Promise<Result<void, string>> {
    try {
      await db
        .update(notificationTable)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(notificationTable.id, notificationId));

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao marcar notificação como lida: ${message}`);
    }
  }

  /**
   * Busca notificações não lidas de um usuário
   */
  async getUnreadNotifications(
    userId: number,
    organizationId: number
  ): Promise<Result<unknown[], string>> {
    try {
      const query = db
        .select()
        .from(notificationTable)
        .where(
          and(
            eq(notificationTable.userId, userId),
            eq(notificationTable.organizationId, organizationId),
            eq(notificationTable.isRead, false)
          )
        )
        .orderBy(desc(notificationTable.createdAt));

      // Type assertion for limit (Drizzle SQL Server pattern - BP-SQL-004)
      type QueryWithLimit = { limit(n: number): Promise<unknown[]> };
      const notifications = await (query as unknown as QueryWithLimit).limit(50);

      return Result.ok(notifications);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao buscar notificações: ${message}`);
    }
  }
}
