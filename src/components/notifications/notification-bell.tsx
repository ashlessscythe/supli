"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/components/providers/socket-provider";

export function NotificationBell() {
  const [hasUnread, setHasUnread] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      setHasUnread(true);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket]);

  const clearNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear notifications");
      }

      setHasUnread(false);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const handleClick = async () => {
    if (hasUnread) {
      await clearNotifications();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={handleClick}
    >
      <Bell className="h-4 w-4" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
      <span className="sr-only">Notifications</span>
    </Button>
  );
}
