'use client';

import { useEffect, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { useStrategicNotifications } from '@/hooks/useStrategicNotifications';
import type { Notification } from '@/lib/notifications/notification-types';

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-500/10',
  high: 'border-l-orange-500 bg-orange-500/10',
  medium: 'border-l-yellow-500 bg-yellow-500/10',
  low: 'border-l-blue-500 bg-blue-500/10',
};

const AUTO_DISMISS_DURATION = 5000; // 5 seconds
const MAX_VISIBLE_TOASTS = 3;
const TOAST_AGE_THRESHOLD = 10000; // Only show toasts from last 10 seconds

// ============================================================================
// Single Toast Component
// ============================================================================

interface ToastProps {
  notification: Notification;
  onDismiss: () => void;
}

const Toast = memo(function Toast({ notification, onDismiss }: ToastProps) {
  // Auto dismiss after 5 seconds (except critical)
  useEffect(() => {
    if (notification.priority !== 'critical') {
      const timer = setTimeout(onDismiss, AUTO_DISMISS_DURATION);
      return () => clearTimeout(timer);
    }
  }, [notification.priority, onDismiss]);

  const priorityStyle = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.low;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`w-80 bg-gray-900/95 backdrop-blur-xl rounded-xl 
        border border-white/10 shadow-2xl overflow-hidden
        border-l-4 ${priorityStyle}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-white font-medium text-sm">{notification.title}</h4>
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-white/10 text-white/40 
              hover:text-white transition-colors flex-shrink-0"
            aria-label="Fechar notificação"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-white/60 text-sm mt-1">{notification.message}</p>

        {notification.actionUrl && (
          <a
            href={notification.actionUrl}
            className="inline-flex items-center gap-1 mt-3 text-sm 
              text-purple-400 hover:text-purple-300 transition-colors"
          >
            Ver detalhes <ExternalLink size={14} />
          </a>
        )}

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {notification.actions.map((action, idx) => (
              <a
                key={idx}
                href={action.url || '#'}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors
                  ${
                    action.variant === 'primary'
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : action.variant === 'danger'
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                {action.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar for auto-dismiss */}
      {notification.priority !== 'critical' && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: AUTO_DISMISS_DURATION / 1000, ease: 'linear' }}
          className="h-1 bg-purple-500/50"
        />
      )}
    </motion.div>
  );
});

// ============================================================================
// Toast Container Component
// ============================================================================

function NotificationToastsInner() {
  const { notifications, removeNotification } = useStrategicNotifications();
  const [now, setNow] = useState(() => Date.now());

  // Update "now" periodically to refresh age calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Only show recent unread notifications as toasts
  const recentUnread = notifications
    .filter((n) => !n.readAt)
    .filter((n) => {
      const age = now - new Date(n.createdAt).getTime();
      return age < TOAST_AGE_THRESHOLD;
    })
    .slice(0, MAX_VISIBLE_TOASTS);

  if (recentUnread.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-6 z-50 space-y-2" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {recentUnread.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export const NotificationToasts = memo(NotificationToastsInner);
