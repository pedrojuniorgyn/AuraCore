/**
 * Tipos para o sistema de notificações em tempo real
 * @module lib/notifications/notification-types
 */

export type NotificationType =
  | 'kpi_alert'
  | 'kpi_update'
  | 'action_plan_update'
  | 'action_plan_completed'
  | 'action_plan_overdue'
  | 'pdca_phase_change'
  | 'goal_achieved'
  | 'achievement_unlocked'
  | 'report_generated'
  | 'integration_status'
  | 'system_announcement'
  | 'mention';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actions?: NotificationAction[];
  createdAt: Date;
  readAt?: Date;
  userId: string;
  organizationId: number;
  branchId: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      priority: NotificationPriority;
    };
  };
}

// SSE Event types
export interface SSENotificationEvent {
  type: 'notification';
  notification: Notification;
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  timestamp: number;
}

export interface SSEConnectedEvent {
  type: 'connected';
  userId: string;
}

export type SSEEvent = SSENotificationEvent | SSEHeartbeatEvent | SSEConnectedEvent;

// API Response types
export interface NotificationsListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export interface NotificationCreateInput {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actions?: NotificationAction[];
  userId: string;
  organizationId: number;
  branchId: number;
}

// Notification type metadata
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  icon: string;
  defaultPriority: NotificationPriority;
  autoMarkRead: boolean;
  ttlSeconds?: number;
}> = {
  kpi_alert: { icon: '📊', defaultPriority: 'high', autoMarkRead: false },
  kpi_update: { icon: '📈', defaultPriority: 'low', autoMarkRead: true },
  action_plan_update: { icon: '📋', defaultPriority: 'medium', autoMarkRead: false },
  action_plan_completed: { icon: '✅', defaultPriority: 'medium', autoMarkRead: false },
  action_plan_overdue: { icon: '⏰', defaultPriority: 'high', autoMarkRead: false },
  pdca_phase_change: { icon: '🔄', defaultPriority: 'medium', autoMarkRead: false },
  goal_achieved: { icon: '🎯', defaultPriority: 'high', autoMarkRead: false },
  achievement_unlocked: { icon: '🏆', defaultPriority: 'medium', autoMarkRead: false },
  report_generated: { icon: '📄', defaultPriority: 'low', autoMarkRead: true },
  integration_status: { icon: '🔗', defaultPriority: 'low', autoMarkRead: true },
  system_announcement: { icon: '📢', defaultPriority: 'medium', autoMarkRead: false },
  mention: { icon: '@', defaultPriority: 'high', autoMarkRead: false },
};

export const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};
