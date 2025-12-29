import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface Notification {
  id: number;
  type: "SUCCESS" | "ERROR" | "WARNING" | "INFO";
  event: string;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
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

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}

























