"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "./notification-item";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { GradientText } from "@/components/ui/magic-components";

export function NotificationDropdown() {
  const { notifications, unreadCount, loading, markAllAsRead, clearAll, dismiss } = useNotifications();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />
          <GradientText className="text-lg font-semibold">
            Notificações
          </GradientText>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
              {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={markAllAsRead}
              className="h-8 w-8 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAll}
              className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
              title="Limpar todas"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center text-gray-400"
          >
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-white/50">Nenhuma notificação</p>
            <p className="text-xs text-white/30 mt-1">Você está em dia!</p>
          </motion.div>
        ) : (
          <div className="divide-y divide-purple-500/10">
            <AnimatePresence>
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification}
                  onDismiss={dismiss}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-purple-500/20 text-center">
          <p className="text-xs text-gray-400">
            {unreadCount > 0
              ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
              : "✓ Todas lidas"}
          </p>
        </div>
      )}
    </div>
  );
}
































