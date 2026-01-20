'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, Trash2, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useStrategicNotifications } from '@/hooks/useStrategicNotifications';
import {
  NOTIFICATION_TYPE_CONFIG,
  PRIORITY_COLORS,
  type Notification,
} from '@/lib/notifications/notification-types';

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onRead,
  onRemove,
}: NotificationItemProps) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const priorityColor = PRIORITY_COLORS[notification.priority];

  const handleClick = () => {
    onRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div
      className={`px-4 py-3 border-b border-white/5 
        hover:bg-white/5 transition-colors cursor-pointer
        ${!notification.readAt ? 'bg-white/5' : ''}`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Priority indicator */}
        <div className={`w-1 rounded-full ${priorityColor}`} />

        {/* Icon */}
        <span className="text-xl flex-shrink-0">{config?.icon || '📌'}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium 
              ${!notification.readAt ? 'text-white' : 'text-white/70'}`}
            >
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
              className="p-1 rounded hover:bg-white/10 
                text-white/30 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-white/50 text-sm truncate">{notification.message}</p>
          <p className="text-white/30 text-xs mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div className="px-4 py-8 text-center text-white/40">
      <Bell size={32} className="mx-auto mb-2 opacity-50" />
      <p>Nenhuma notificação</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function NotificationBellInner() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useStrategicNotifications();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} className="text-white/70" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] 
              bg-red-500 text-white text-xs font-bold rounded-full
              flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}

        {/* Connection indicator */}
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full
            ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          title={isConnected ? 'Conectado' : 'Desconectado'}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 
              bg-gray-900/95 backdrop-blur-xl rounded-2xl 
              border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b border-white/10 
              flex items-center justify-between"
            >
              <h3 className="text-white font-semibold">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-lg hover:bg-white/10 
                      text-white/50 hover:text-white transition-colors"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg hover:bg-white/10 
                    text-white/50 hover:text-white transition-colors"
                  title="Limpar todas"
                >
                  <Trash2 size={16} />
                </button>
                <Link
                  href="/strategic/settings/notifications"
                  className="p-1.5 rounded-lg hover:bg-white/10 
                    text-white/50 hover:text-white transition-colors"
                  title="Configurações"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings size={16} />
                </Link>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {notifications.length === 0 ? (
                <EmptyState />
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onRemove={removeNotification}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 10 && (
              <div className="px-4 py-3 border-t border-white/10">
                <Link
                  href="/strategic/notifications"
                  className="block text-center text-sm text-purple-400 
                    hover:text-purple-300 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Ver todas as notificações
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const NotificationBell = memo(NotificationBellInner);
