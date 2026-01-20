/**
 * Hook para acessar o sistema de notificações do módulo Strategic
 *
 * @module hooks/useStrategicNotifications
 *
 * @example
 * ```tsx
 * import { useStrategicNotifications } from '@/hooks/useStrategicNotifications';
 *
 * function MyComponent() {
 *   const { notifications, unreadCount, markAsRead } = useStrategicNotifications();
 *
 *   return (
 *     <div>
 *       <span>Você tem {unreadCount} notificações não lidas</span>
 *       {notifications.map(n => (
 *         <div key={n.id} onClick={() => markAsRead(n.id)}>
 *           {n.title}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

export { useNotifications as useStrategicNotifications } from '@/contexts/NotificationContext';
export type {
  Notification as StrategicNotification,
  NotificationType as StrategicNotificationType,
  NotificationPriority,
  NotificationPreferences,
  NotificationAction,
} from '@/lib/notifications/notification-types';
