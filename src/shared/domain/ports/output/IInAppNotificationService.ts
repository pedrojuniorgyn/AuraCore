/**
 * IInAppNotificationService - Port interface for in-app notifications
 * 
 * Handles database-persisted notifications shown in the UI.
 * Different from email/webhook notifications (INotificationService in integrations).
 * 
 * @see src/services/notification-service.ts (legacy implementation)
 * @see src/shared/infrastructure/notifications/InAppNotificationAdapter.ts (adapter)
 */

/**
 * Notification types
 */
export type NotificationType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';

/**
 * Notification events
 */
export type NotificationEvent =
  | 'IMPORT_SUCCESS'
  | 'IMPORT_ERROR'
  | 'SEFAZ_ERROR_656'
  | 'NEW_DOCUMENTS'
  | 'CLASSIFICATION_SUCCESS'
  | 'CLASSIFICATION_ERROR'
  | 'PAYABLE_CREATED'
  | 'PAYABLE_DUE_SOON'
  | 'PAYABLE_OVERDUE'
  | 'RECEIVABLE_CREATED'
  | 'RECEIVABLE_DUE_SOON'
  | 'RECEIVABLE_OVERDUE'
  | 'SYSTEM_ERROR';

/**
 * Parameters for creating a notification
 */
export interface CreateNotificationParams {
  organizationId: number;
  branchId?: number;
  userId?: number;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

/**
 * In-app notification service port
 */
export interface IInAppNotificationService {
  /**
   * Create a new notification
   */
  create(params: CreateNotificationParams): Promise<void>;

  /**
   * Notify successful import
   */
  notifyImportSuccess(
    organizationId: number,
    branchId: number,
    imported: number,
    duplicates: number,
    totalValue?: number
  ): Promise<void>;

  /**
   * Notify SEFAZ error 656
   */
  notifySefazError656(organizationId: number, branchId: number): Promise<void>;

  /**
   * Notify import error
   */
  notifyImportError(organizationId: number, branchId: number, error: string): Promise<void>;

  /**
   * Notify payables due soon
   */
  notifyPayablesDueSoon(organizationId: number, count: number, totalValue: number): Promise<void>;

  /**
   * Notify overdue payables
   */
  notifyPayablesOverdue(organizationId: number, count: number, totalValue: number): Promise<void>;

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number, userId: string): Promise<void>;

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): Promise<void>;

  /**
   * Get notifications for a user
   */
  getByUser(userId: string, unreadOnly?: boolean, limit?: number): Promise<unknown[]>;

  /**
   * Count unread notifications
   */
  countUnread(userId: string): Promise<number>;

  /**
   * Cleanup old notifications (>30 days)
   */
  cleanupOld(): Promise<void>;
}
