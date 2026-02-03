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

// ========================================
// TIPOS PARA RESEND EMAIL
// ========================================

/**
 * Parâmetros para email de aprovação pendente
 */
export interface ApprovalPendingEmailParams {
  to: string;
  approverName: string;
  strategyTitle: string;
  strategyCode: string;
  submittedBy: string;
  submittedAt: Date;
  approvalUrl: string;
}

/**
 * Parâmetros para email de decisão de aprovação
 */
export interface ApprovalDecisionEmailParams {
  to: string;
  recipientName: string;
  strategyTitle: string;
  strategyCode: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  decisionBy: string;
  decisionAt: Date;
  comment?: string;
  reason?: string;
}

/**
 * Parâmetros para email de alerta de KPI
 */
export interface KpiAlertEmailParams {
  to: string;
  ownerName: string;
  kpiName: string;
  kpiCode: string;
  currentValue: number;
  targetValue: number;
  variance: number;
  unit: string;
  alertUrl: string;
}

/**
 * Parâmetros para email de delegação de aprovação
 */
export interface DelegationEmailParams {
  to: string;
  delegateName: string;
  delegatorName: string;
  strategyTitle: string;
  strategyCode: string;
  delegationUrl: string;
  expiresAt?: Date;
}

/**
 * Resultado de envio de email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
