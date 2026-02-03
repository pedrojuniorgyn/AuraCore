/**
 * Notification Types and Interfaces
 * Tipos compartilhados para sistema de notificações
 * 
 * @module shared/infrastructure/notifications
 */

export type NotificationType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';

export type NotificationEvent =
  | 'KPI_CRITICAL'
  | 'KPI_WARNING'
  | 'ACTION_PLAN_OVERDUE'
  | 'ACTION_PLAN_STALE'
  | 'STRATEGY_SUBMITTED'
  | 'STRATEGY_APPROVED'
  | 'STRATEGY_REJECTED'
  | 'STRATEGY_CHANGES_REQUESTED'
  | 'IMPORT_SUCCESS'
  | 'IMPORT_ERROR'
  | 'NEW_DOCUMENTS'
  | 'PAYABLE_DUE_SOON';

export interface EmailParams {
  to: string[];
  subject: string;
  body: string;
  template?: string;
  variables?: Record<string, string | number>;
}

export interface WebhookParams {
  url: string;
  payload: unknown;
  retryAttempts?: number;
  headers?: Record<string, string>;
}

export interface InAppNotificationParams {
  organizationId: number;
  branchId: number;
  /**
   * User ID - aceita number ou string
   * 
   * NOTA: O schema do banco (notifications.userId) é nvarchar (string).
   * Se passar number, será convertido para string automaticamente.
   * Aceita ambos para compatibilidade com diferentes partes do sistema.
   */
  userId: number | string;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  webhookEnabled: boolean;
  inAppEnabled: boolean;
  webhookUrl?: string;
  emailRecipients?: string[];
  retryAttempts: number;
}
