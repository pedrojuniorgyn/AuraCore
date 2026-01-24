/**
 * NotificationStore - In-memory store for notifications
 * 
 * @module lib/notifications
 * @description Armazena notificações em memória para uso interno.
 * Em produção, substituir por banco de dados.
 */
import type { Notification } from './notification-types';

// Mock storage - em produção usar banco de dados
const notificationsStore = new Map<string, Notification[]>();

/**
 * Adiciona uma notificação ao store do usuário
 * Mantém máximo de 100 notificações por usuário
 */
export function addNotificationToStore(userId: string, notification: Notification): void {
  const existing = notificationsStore.get(userId) || [];
  notificationsStore.set(userId, [notification, ...existing].slice(0, 100));
}

/**
 * Obtém notificações de um usuário
 */
export function getNotifications(userId: string): Notification[] {
  return notificationsStore.get(userId) || [];
}

/**
 * Remove todas as notificações de um usuário
 */
export function clearNotifications(userId: string): void {
  notificationsStore.delete(userId);
}

/**
 * Marca notificação como lida
 */
export function markAsRead(userId: string, notificationId: string): boolean {
  const notifications = notificationsStore.get(userId);
  if (!notifications) return false;
  
  const notification = notifications.find(n => n.id === notificationId);
  if (!notification) return false;
  
  notification.readAt = new Date();
  return true;
}
