"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "./notification-dropdown";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  
  // Verificar se há notificações críticas não lidas
  const hasCritical = notifications.some(
    (n) => (n.type === "CRITICAL" || n.type === "ERROR") && n.isRead === 0
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-white/10 transition-colors"
        >
          <Bell className="h-5 w-5 text-gray-300" />
          
          {/* Badge de contagem */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={`absolute -top-1 -right-1 text-white text-xs font-bold rounded-full 
                  min-w-[20px] h-5 px-1 flex items-center justify-center
                  ${hasCritical ? "bg-red-500" : "bg-purple-500"}`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Pulse para críticos */}
          {hasCritical && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full 
              bg-red-500 animate-ping opacity-75 pointer-events-none" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 
          border border-purple-500/20 shadow-2xl backdrop-blur-xl"
        align="end"
        sideOffset={8}
      >
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}
































