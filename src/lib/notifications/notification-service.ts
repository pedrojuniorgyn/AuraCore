/**
 * Serviço para gerenciamento de notificações
 *
 * Em produção, este serviço deve ser integrado com:
 * - Redis Pub/Sub para broadcasting de eventos
 * - Banco de dados para persistência
 * - Sistema de filas para processamento assíncrono
 *
 * @module lib/notifications/notification-service
 */

import type {
  Notification,
  NotificationCreateInput,
} from './notification-types';

// ============================================================================
// In-Memory Store (substituir por banco de dados em produção)
// ============================================================================

const notificationsStore = new Map<string, Notification[]>();
const subscribersStore = new Map<string, Set<(notification: Notification) => void>>();

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Cria uma nova notificação para um usuário
 */
export async function createNotification(
  input: NotificationCreateInput
): Promise<Notification> {
  const notification: Notification = {
    id: crypto.randomUUID(),
    type: input.type,
    priority: input.priority,
    title: input.title,
    message: input.message,
    data: input.data,
    actionUrl: input.actionUrl,
    actions: input.actions,
    createdAt: new Date(),
    userId: input.userId,
    organizationId: input.organizationId,
    branchId: input.branchId,
  };

  // Store notification
  const userNotifications = notificationsStore.get(input.userId) || [];
  notificationsStore.set(input.userId, [notification, ...userNotifications].slice(0, 100));

  // Notify subscribers (for SSE)
  const subscribers = subscribersStore.get(input.userId);
  if (subscribers) {
    subscribers.forEach((callback) => callback(notification));
  }

  return notification;
}

/**
 * Busca notificações de um usuário
 */
export async function getNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  let notifications = notificationsStore.get(userId) || [];

  if (unreadOnly) {
    notifications = notifications.filter((n) => !n.readAt);
  }

  const total = notifications.length;
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return {
    notifications: notifications.slice(offset, offset + limit),
    total,
    unreadCount,
  };
}

/**
 * Marca notificação como lida
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const notifications = notificationsStore.get(userId) || [];
  const updated = notifications.map((n) =>
    n.id === notificationId ? { ...n, readAt: new Date() } : n
  );
  notificationsStore.set(userId, updated);
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notifications = notificationsStore.get(userId) || [];
  const updated = notifications.map((n) => ({
    ...n,
    readAt: n.readAt || new Date(),
  }));
  notificationsStore.set(userId, updated);
}

/**
 * Remove uma notificação
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  const notifications = notificationsStore.get(userId) || [];
  notificationsStore.set(
    userId,
    notifications.filter((n) => n.id !== notificationId)
  );
}

/**
 * Remove todas as notificações de um usuário
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  notificationsStore.delete(userId);
}

/**
 * Inscreve para receber notificações em tempo real
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
): () => void {
  if (!subscribersStore.has(userId)) {
    subscribersStore.set(userId, new Set());
  }

  subscribersStore.get(userId)!.add(callback);

  // Retorna função de cleanup
  return () => {
    subscribersStore.get(userId)?.delete(callback);
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cria notificação de alerta de KPI
 */
export async function createKpiAlertNotification(params: {
  userId: string;
  organizationId: number;
  branchId: number;
  kpiId: string;
  kpiName: string;
  currentValue: number;
  targetValue: number;
  status: 'critical' | 'warning';
}): Promise<Notification> {
  return createNotification({
    type: 'kpi_alert',
    priority: params.status === 'critical' ? 'critical' : 'high',
    title: `KPI ${params.status === 'critical' ? 'Crítico' : 'em Alerta'}`,
    message: `${params.kpiName}: ${params.currentValue} (meta: ${params.targetValue})`,
    actionUrl: `/strategic/kpis/${params.kpiId}`,
    data: {
      kpiId: params.kpiId,
      currentValue: params.currentValue,
      targetValue: params.targetValue,
    },
    actions: [
      { label: 'Ver KPI', url: `/strategic/kpis/${params.kpiId}`, variant: 'primary' },
      { label: 'Criar Ação', url: `/strategic/action-plans/new?kpiId=${params.kpiId}` },
    ],
    userId: params.userId,
    organizationId: params.organizationId,
    branchId: params.branchId,
  });
}

/**
 * Cria notificação de plano de ação atrasado
 */
export async function createActionPlanOverdueNotification(params: {
  userId: string;
  organizationId: number;
  branchId: number;
  planId: string;
  planTitle: string;
  dueDate: Date;
}): Promise<Notification> {
  return createNotification({
    type: 'action_plan_overdue',
    priority: 'high',
    title: 'Plano de Ação Atrasado',
    message: `"${params.planTitle}" está atrasado desde ${params.dueDate.toLocaleDateString('pt-BR')}`,
    actionUrl: `/strategic/action-plans/${params.planId}`,
    data: {
      planId: params.planId,
      dueDate: params.dueDate.toISOString(),
    },
    userId: params.userId,
    organizationId: params.organizationId,
    branchId: params.branchId,
  });
}

/**
 * Cria notificação de conquista desbloqueada
 */
export async function createAchievementUnlockedNotification(params: {
  userId: string;
  organizationId: number;
  branchId: number;
  achievementId: string;
  achievementName: string;
  xpGained: number;
}): Promise<Notification> {
  return createNotification({
    type: 'achievement_unlocked',
    priority: 'medium',
    title: '🏆 Conquista Desbloqueada!',
    message: `Você desbloqueou "${params.achievementName}" e ganhou +${params.xpGained} XP`,
    actionUrl: '/strategic/achievements',
    data: {
      achievementId: params.achievementId,
      xpGained: params.xpGained,
    },
    userId: params.userId,
    organizationId: params.organizationId,
    branchId: params.branchId,
  });
}
