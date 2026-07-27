"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { hrefForNotification } from "@/lib/notification-href";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: unknown;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(
        (data.notifications ?? []).map(
          (n: NotificationItem & { createdAt: string | Date }) => ({
            ...n,
            createdAt:
              typeof n.createdAt === "string"
                ? n.createdAt
                : new Date(n.createdAt).toISOString(),
          })
        )
      );
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  const clearAll = async () => {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (res.ok) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleClick = async (n: NotificationItem) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    });
    setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    setUnreadCount((c) => Math.max(0, c - 1));
    setOpen(false);
    router.push(hrefForNotification(n));
  };

  const badge =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          document.body.style.removeProperty("pointer-events");
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {badge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
              {badge}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 12).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-0.5 py-2",
                !n.read && "bg-accent/50"
              )}
              onClick={() => handleClick(n)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {n.message}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
