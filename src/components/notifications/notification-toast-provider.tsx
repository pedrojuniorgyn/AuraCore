"use client";

/**
 * NotificationToastProvider - Provider que exibe toasts para notificações críticas
 * 
 * Use no layout para habilitar toasts automáticos para notificações críticas.
 * 
 * @module components/notifications
 */
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationToast } from "./notification-toast";

export function NotificationToastProvider() {
  const { toastNotification, closeToast } = useNotifications();

  return (
    <NotificationToast 
      notification={toastNotification} 
      onClose={closeToast}
      duration={6000}
    />
  );
}
