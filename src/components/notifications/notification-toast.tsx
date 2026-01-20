"use client";

/**
 * NotificationToast - Toast para alertas críticos em tempo real
 * 
 * @module components/notifications
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trophy, Info, CheckCircle, X, XCircle, type LucideIcon } from "lucide-react";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

interface Props {
  notification: Notification | null;
  onClose: () => void;
  duration?: number;
}

interface TypeConfig {
  icon: LucideIcon;
  gradient: string;
  borderColor: string;
  shadowColor: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  CRITICAL: { 
    icon: AlertTriangle, 
    gradient: "from-red-500/20 to-red-600/20",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  ERROR: { 
    icon: XCircle, 
    gradient: "from-red-500/20 to-red-600/20",
    borderColor: "border-red-500/30",
    shadowColor: "shadow-red-500/20",
  },
  WARNING: { 
    icon: AlertTriangle, 
    gradient: "from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-500/30",
    shadowColor: "shadow-yellow-500/20",
  },
  ACHIEVEMENT: { 
    icon: Trophy, 
    gradient: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    shadowColor: "shadow-purple-500/20",
  },
  INFO: { 
    icon: Info, 
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    shadowColor: "shadow-blue-500/20",
  },
  SUCCESS: { 
    icon: CheckCircle, 
    gradient: "from-green-500/20 to-emerald-500/20",
    borderColor: "border-green-500/30",
    shadowColor: "shadow-green-500/20",
  },
};

export function NotificationToast({ notification, onClose, duration = 5000 }: Props) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, duration, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className="fixed top-4 right-4 z-[100] max-w-sm"
        >
          {(() => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
            const Icon = config.icon;

            return (
              <div className={`
                p-4 rounded-2xl bg-gradient-to-r ${config.gradient}
                border ${config.borderColor} backdrop-blur-xl
                shadow-2xl ${config.shadowColor}
              `}>
                <div className="flex gap-3">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className={`p-2 rounded-xl bg-white/10`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{notification.title}</p>
                    {notification.message && (
                      <p className="text-white/70 text-xs mt-1 line-clamp-2">{notification.message}</p>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 
                      hover:text-white transition-all h-fit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: duration / 1000, ease: "linear" }}
                    className="h-full bg-white/50 rounded-full"
                  />
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
