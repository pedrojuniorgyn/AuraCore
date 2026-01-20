"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertTriangle, Info, Trophy, Clock, X, ExternalLink, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onDismiss?: (id: number) => void;
}

interface TypeConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  label: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  SUCCESS: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    label: "Sucesso",
  },
  ERROR: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "Erro",
  },
  CRITICAL: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "Crítico",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    label: "Alerta",
  },
  INFO: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    label: "Info",
  },
  ACHIEVEMENT: {
    icon: Trophy,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    label: "Conquista",
  },
};

export function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead, dismiss } = useNotifications();

  const handleClick = () => {
    if (notification.isRead === 0) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(notification.id);
    } else {
      dismiss(notification.id);
    }
  };

  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      onClick={handleClick}
      className={cn(
        "p-4 hover:bg-purple-500/10 transition-all cursor-pointer group relative",
        notification.isRead === 0 && "bg-purple-500/5"
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 
          hover:bg-white/10 transition-all z-10"
        aria-label="Dispensar notificação"
      >
        <X className="w-3 h-3 text-white/50 hover:text-white" />
      </button>

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border",
            config.bg,
            config.border
          )}
        >
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium", config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeAgo}
            </span>
            {notification.isRead === 0 && (
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            )}
          </div>

          <h4
            className={cn(
              "text-sm font-medium text-white group-hover:text-purple-200 transition-colors",
              notification.isRead === 0 && "font-semibold"
            )}
          >
            {notification.title}
          </h4>

          {notification.message && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}

          {notification.actionUrl && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg 
                bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-all">
                Ver mais <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
































