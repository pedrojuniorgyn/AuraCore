import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Tipos de notificação
 */
export type NotificationType = "SUCCESS" | "ERROR" | "WARNING" | "INFO";

/**
 * Eventos de notificação
 */
export enum NotificationEvent {
  // SEFAZ
  IMPORT_SUCCESS = "IMPORT_SUCCESS",
  IMPORT_ERROR = "IMPORT_ERROR",
  SEFAZ_ERROR_656 = "SEFAZ_ERROR_656",
  NEW_DOCUMENTS = "NEW_DOCUMENTS",
  
  // Classificação
  CLASSIFICATION_SUCCESS = "CLASSIFICATION_SUCCESS",
  CLASSIFICATION_ERROR = "CLASSIFICATION_ERROR",
  
  // Contas a Pagar
  PAYABLE_CREATED = "PAYABLE_CREATED",
  PAYABLE_DUE_SOON = "PAYABLE_DUE_SOON",
  PAYABLE_OVERDUE = "PAYABLE_OVERDUE",
  
  // Contas a Receber
  RECEIVABLE_CREATED = "RECEIVABLE_CREATED",
  RECEIVABLE_DUE_SOON = "RECEIVABLE_DUE_SOON",
  RECEIVABLE_OVERDUE = "RECEIVABLE_OVERDUE",
  
  // Sistema
  SYSTEM_ERROR = "SYSTEM_ERROR",
}

/**
 * Interface para criar notificação
 */
export interface CreateNotificationParams {
  organizationId: number;
  branchId?: number;
  userId?: number; // Se não informado, notifica todos usuários
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  message?: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

/**
 * Service para gerenciar notificações
 */
export class NotificationService {
  /**
   * Criar uma nova notificação
   */
  async create(params: CreateNotificationParams): Promise<void> {
    try {
      await db.insert(notifications).values({
        organizationId: params.organizationId,
        branchId: params.branchId,
        userId: params.userId,
        type: params.type,
        event: params.event,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
        actionUrl: params.actionUrl,
      });

      console.log(
        `🔔 Notificação criada: [${params.type}] ${params.title}`
      );
    } catch (error) {
      console.error("❌ Erro ao criar notificação:", error);
      // Não lança erro para não quebrar o fluxo principal
    }
  }

  /**
   * Notificar importação bem-sucedida
   */
  async notifyImportSuccess(
    organizationId: number,
    branchId: number,
    imported: number,
    duplicates: number,
    totalValue?: number
  ): Promise<void> {
    let message = `${imported} documento(s) importado(s) com sucesso`;
    if (duplicates > 0) {
      message += `, ${duplicates} duplicado(s)`;
    }
    if (totalValue) {
      message += `. Valor total: R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }

    await this.create({
      organizationId,
      branchId,
      type: "SUCCESS",
      event: NotificationEvent.NEW_DOCUMENTS,
      title: "📦 Novos documentos importados",
      message,
      data: { imported, duplicates, totalValue },
      actionUrl: "/fiscal/documentos",
    });
  }

  /**
   * Notificar erro SEFAZ 656
   */
  async notifySefazError656(
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await this.create({
      organizationId,
      branchId,
      type: "WARNING",
      event: NotificationEvent.SEFAZ_ERROR_656,
      title: "⏰ SEFAZ: Aguardar 1 hora",
      message: "Consumo Indevido - Não há novos documentos disponíveis no momento",
      actionUrl: "/fiscal/documentos",
    });
  }

  /**
   * Notificar erro na importação
   */
  async notifyImportError(
    organizationId: number,
    branchId: number,
    error: string
  ): Promise<void> {
    await this.create({
      organizationId,
      branchId,
      type: "ERROR",
      event: NotificationEvent.IMPORT_ERROR,
      title: "❌ Erro na importação SEFAZ",
      message: error,
      data: { error },
      actionUrl: "/fiscal/documentos",
    });
  }

  /**
   * Notificar contas vencendo em breve
   */
  async notifyPayablesDueSoon(
    organizationId: number,
    count: number,
    totalValue: number
  ): Promise<void> {
    await this.create({
      organizationId,
      type: "WARNING",
      event: NotificationEvent.PAYABLE_DUE_SOON,
      title: `⏰ ${count} conta(s) vencendo em 3 dias`,
      message: `Valor total: R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      data: { count, totalValue },
      actionUrl: "/financeiro/contas-pagar",
    });
  }

  /**
   * Notificar contas vencidas
   */
  async notifyPayablesOverdue(
    organizationId: number,
    count: number,
    totalValue: number
  ): Promise<void> {
    await this.create({
      organizationId,
      type: "ERROR",
      event: NotificationEvent.PAYABLE_OVERDUE,
      title: `❌ ${count} conta(s) vencida(s)`,
      message: `Valor total em atraso: R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      data: { count, totalValue },
      actionUrl: "/financeiro/contas-pagar",
    });
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: sql`1`,
        readAt: sql`GETDATE()`,
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  /**
   * Marcar todas como lidas
   */
  async markAllAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: sql`1`,
        readAt: sql`GETDATE()`,
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, sql`0`)
        )
      );
  }

  /**
   * Obter notificações de um usuário
   */
  async getByUser(
    userId: number,
    unreadOnly: boolean = false,
    limit: number = 50
  ) {
    const conditions = [eq(notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, sql`0`));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  /**
   * Contar notificações não lidas
   */
  async countUnread(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, sql`0`)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Deletar notificações antigas (mais de 30 dias)
   */
  async cleanupOld(): Promise<void> {
    await db
      .delete(notifications)
      .where(
        sql`created_at < DATEADD(day, -30, GETDATE())`
      );

    console.log("🧹 Notificações antigas limpas (>30 dias)");
  }
}

// Exportar instância singleton
export const notificationService = new NotificationService();

