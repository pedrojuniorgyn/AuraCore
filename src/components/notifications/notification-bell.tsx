"use client";

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
  const { unreadCount, loading } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-white/10 transition-colors"
        >
          <Bell className="h-5 w-5 text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/20 shadow-2xl"
        align="end"
      >
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}






















