"use client";

import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    if (notification.isRead === 0) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const typeConfig = {
    SUCCESS: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    },
    ERROR: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
    WARNING: {
      icon: AlertTriangle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
    INFO: {
      icon: Info,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
  };

  const config = typeConfig[notification.type];
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-4 hover:bg-purple-500/10 transition-all cursor-pointer group",
        notification.isRead === 0 && "bg-purple-500/5"
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
            config.bg,
            config.border
          )}
        >
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "text-sm font-medium text-white group-hover:text-purple-200 transition-colors",
                notification.isRead === 0 && "font-semibold"
              )}
            >
              {notification.title}
            </h4>
            {notification.isRead === 0 && (
              <span className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full" />
            )}
          </div>

          {notification.message && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}

          <p className="text-xs text-gray-500 mt-2">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}
































