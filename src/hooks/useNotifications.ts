import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export type NotificationType = "SUCCESS" | "ERROR" | "WARNING" | "INFO" | "CRITICAL" | "ACHIEVEMENT";

export interface Notification {
  id: number;
  type: NotificationType;
  event: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  actionUrl: string | null;
  isRead: number;
  readAt: Date | null;
  createdAt: Date;
}

export function useNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/notifications?limit=50");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [session]);

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/notifications/count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        // Atualizar localmente
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, isRead: 1, readAt: new Date() }
              : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        // Atualizar localmente
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            isRead: 1,
            readAt: new Date(),
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, []);

  const dismiss = useCallback(async (notificationId: number) => {
    try {
      // Atualizar localmente (otimista)
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && notification.isRead === 0) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
      
      // TODO: Implementar endpoint DELETE /api/notifications/:id se necessário
      await fetch(`/api/notifications/${notificationId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      
      // TODO: Implementar endpoint DELETE /api/notifications se necessário
      await fetch("/api/notifications", { method: "DELETE" });
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }, []);

  const closeToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      fetchUnreadCount();

      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    }
  }, [session, fetchNotifications, fetchUnreadCount]);

  // Mostrar toast para notificações críticas não lidas
  useEffect(() => {
    const critical = notifications.find(
      (n) => (n.type === "CRITICAL" || n.type === "ERROR") && n.isRead === 0
    );
    if (critical && !toastNotification) {
      setToastNotification(critical);
    }
  }, [notifications, toastNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    toastNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    closeToast,
    refresh: fetchNotifications,
  };
}
































