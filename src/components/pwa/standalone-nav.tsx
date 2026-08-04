"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWA } from "@/hooks/use-pwa";
import { staffNavigationItems } from "@/lib/nav-config";

const icons = {
  Dashboard: LayoutDashboard,
  Supplies: Package,
  Inbound: PackagePlus,
  History: Search,
} as const;

/**
 * Bottom tab bar shown only when the app is running as an installed PWA
 * (standalone / fullscreen). Keeps primary navigation reachable without
 * browser chrome.
 */
export function StandaloneNav() {
  const { isStandalone } = usePWA();
  const pathname = usePathname();

  if (!isStandalone) return null;

  // Hide on kiosk and auth surfaces — they have their own chrome.
  if (
    pathname.startsWith("/kiosk") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/accept-invite") ||
    pathname === "/" ||
    pathname.startsWith("/~offline")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="App navigation"
      className="standalone-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {staffNavigationItems.map((item) => {
          const Icon = icons[item.name];
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/admin"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (item.href === "/dashboard/supplies" &&
                  pathname.startsWith("/admin/supplies")) ||
                (item.href === "/dashboard/inbound" &&
                  pathname.startsWith("/admin/inbound")) ||
                (item.href === "/dashboard/history" &&
                  pathname.startsWith("/admin/history"));

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
