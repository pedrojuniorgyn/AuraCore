import { useState, useEffect, useCallback, useRef } from "react";
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
  
  // FIX: Rastrear notificações já mostradas como toast para evitar loop infinito
  const toastedIdsRef = useRef<Set<number>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/notifications?limit=50");
      if (response.ok) {
        const data = await response.json();
        // API retorna { success: true, total: N, notifications: [...] }
        setNotifications(data.notifications || []);
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
      // Novo endpoint: POST /api/notifications/[id]/read
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      // Não há endpoint bulk - marcar cada notificação não lida
      const unreadNotifications = notifications.filter((n) => n.isRead === 0);
      
      // Marcar localmente primeiro (otimista)
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          isRead: 1,
          readAt: new Date(),
        }))
      );
      setUnreadCount(0);
      // FIX: Limpar toasted IDs ao marcar todas como lidas
      toastedIdsRef.current.clear();

      // Chamar API para cada notificação não lida em background
      await Promise.allSettled(
        unreadNotifications.map((notif) =>
          fetch(`/api/notifications/${notif.id}/read`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })
        )
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [notifications]);

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
      
      // FIX: Remover do Set quando dismissada
      toastedIdsRef.current.delete(notificationId);
      
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
      
      // FIX: Limpar todos os toasted IDs
      toastedIdsRef.current.clear();
      
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

  // FIX: Mostrar toast apenas para notificações NOVAS que ainda não foram toasted
  useEffect(() => {
    const critical = notifications.find(
      (n) => 
        (n.type === "CRITICAL" || n.type === "ERROR") && 
        n.isRead === 0 && 
        !toastedIdsRef.current.has(n.id)
    );
    
    if (critical) {
      toastedIdsRef.current.add(critical.id);
      setToastNotification(critical);
    }
  }, [notifications]);

  // FIX: Limpar toasted IDs quando notificações são removidas
  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));
    toastedIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        toastedIdsRef.current.delete(id);
      }
    });
  }, [notifications]);

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
































