'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  Trash2,
  Filter,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useStrategicNotifications } from '@/hooks/useStrategicNotifications';
import {
  NOTIFICATION_TYPE_CONFIG,
  PRIORITY_COLORS,
  type Notification,
} from '@/lib/notifications/notification-types';

// ============================================================================
// Filter Component
// ============================================================================

interface FilterOption {
  value: string;
  label: string;
}

const typeFilters: FilterOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'kpi_alert', label: 'Alertas KPI' },
  { value: 'action_plan_update', label: 'Planos de Ação' },
  { value: 'achievement_unlocked', label: 'Conquistas' },
  { value: 'system_announcement', label: 'Sistema' },
];

const statusFilters: FilterOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
];

// ============================================================================
// Notification Card Component
// ============================================================================

interface NotificationCardProps {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}

const NotificationCard = memo(function NotificationCard({
  notification,
  onRead,
  onRemove,
}: NotificationCardProps) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const priorityColor = PRIORITY_COLORS[notification.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`bg-white/5 rounded-xl p-4 border border-white/10
        hover:bg-white/10 transition-colors
        ${!notification.readAt ? 'border-l-4 ' + priorityColor : ''}`}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center
          ${notification.readAt ? 'bg-white/5' : 'bg-purple-500/20'}`}
        >
          <span className="text-xl">{config?.icon || '📌'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                className={`font-medium 
                ${!notification.readAt ? 'text-white' : 'text-white/70'}`}
              >
                {notification.title}
              </h3>
              <p className="text-white/50 text-sm mt-1">{notification.message}</p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.readAt && (
                <button
                  onClick={() => onRead(notification.id)}
                  className="p-2 rounded-lg hover:bg-white/10 
                    text-white/40 hover:text-green-400 transition-colors"
                  title="Marcar como lida"
                >
                  <Check size={16} />
                </button>
              )}
              <button
                onClick={() => onRemove(notification.id)}
                className="p-2 rounded-lg hover:bg-white/10 
                  text-white/40 hover:text-red-400 transition-colors"
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            <span>
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              {format(new Date(notification.createdAt), "d 'de' MMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>

          {/* Action */}
          {notification.actionUrl && (
            <Link
              href={notification.actionUrl}
              className="inline-flex items-center gap-1 mt-3 text-sm 
                text-purple-400 hover:text-purple-300 transition-colors"
            >
              Ver detalhes <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

function NotificationCenterInner() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useStrategicNotifications();

  // Apply filters
  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (statusFilter === 'unread' && n.readAt) return false;
    if (statusFilter === 'read' && !n.readAt) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Bell className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notificações</h1>
            <p className="text-white/50 text-sm">
              {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
              {' • '}
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 
                text-white/70 hover:text-white transition-colors text-sm
                flex items-center gap-2"
            >
              <Check size={16} /> Marcar todas como lidas
            </button>
          )}
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 
              text-white/70 hover:text-white transition-colors text-sm
              flex items-center gap-2"
          >
            <Trash2 size={16} /> Limpar
          </button>
          <Link
            href="/strategic/settings/notifications"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 
              text-white/70 hover:text-white transition-colors text-sm
              flex items-center gap-2"
          >
            <Settings size={16} /> Configurar
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-white/40" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {typeFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 
            text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {statusFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto text-white/20 mb-4" />
          <h3 className="text-white/50 text-lg mb-2">Nenhuma notificação</h3>
          <p className="text-white/30 text-sm">
            {statusFilter === 'unread'
              ? 'Você está em dia! Nenhuma notificação não lida.'
              : 'Você não tem notificações no momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onRemove={removeNotification}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export const NotificationCenter = memo(NotificationCenterInner);
