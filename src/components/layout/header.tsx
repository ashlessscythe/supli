"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  LogOut,
  Shield,
  PackagePlus,
  Search,
  Menu,
  MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staffNavigationItems } from "@/lib/nav-config";
import { handleNavReselectClick } from "@/lib/nav-reselect";

const navIcons = {
  Dashboard: LayoutDashboard,
  Supplies: Package,
  Inbound: PackagePlus,
  History: Search,
} as const;

function navLinkClass(active: boolean) {
  return cn(
    "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
    active ? "text-foreground" : "text-foreground/60"
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";
  const isInAdminSection = pathname.startsWith("/admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminHref = isInAdminSection ? "/dashboard" : "/admin";
  const adminLabel = isInAdminSection ? "Regular View" : "Admin";

  return (
    <header className="sticky top-0 z-50 w-full max-w-[100vw] border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 min-w-0 items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu
            modal={false}
            open={mobileOpen}
            onOpenChange={(next) => {
              setMobileOpen(next);
              if (!next) {
                document.body.style.removeProperty("pointer-events");
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="z-[60] w-[min(18rem,calc(100vw-2rem))]"
            >
              {staffNavigationItems.map((item) => {
                const Icon = navIcons[item.name];
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center",
                        pathname === item.href &&
                          "bg-accent text-accent-foreground"
                      )}
                      onClick={(event) =>
                        handleNavReselectClick(event, {
                          href: item.href,
                          pathname,
                          replace: router.replace,
                          onNavigate: () => setMobileOpen(false),
                        })
                      }
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              {session?.user && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/kiosk"
                    className="flex items-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    <MonitorSmartphone className="mr-2 h-4 w-4" />
                    <span>Kiosk</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link
                    href={adminHref}
                    className="flex items-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>{adminLabel}</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {session?.user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => signOut({ callbackUrl: "/login" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/" className="flex shrink-0 items-center space-x-2">
            <Package className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Supplies Tracker
            </span>
          </Link>

          <nav className="ml-6 hidden items-center space-x-6 text-sm font-medium md:flex">
            {staffNavigationItems.map((item) => {
              const Icon = navIcons[item.name];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) =>
                    handleNavReselectClick(event, {
                      href: item.href,
                      pathname,
                      replace: router.replace,
                    })
                  }
                  className={navLinkClass(pathname === item.href)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            {session?.user && (
              <Link
                href="/kiosk"
                className={navLinkClass(pathname.startsWith("/kiosk"))}
              >
                <span>Kiosk</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href={adminHref}
                className={navLinkClass(pathname.startsWith("/admin"))}
              >
                <Shield className="h-4 w-4" />
                <span>{adminLabel}</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {session?.user && <NotificationBell />}
          <ThemeSelector />
          {session?.user && (
            <>
              <span className="hidden max-w-[12rem] truncate text-sm text-foreground/60 lg:inline">
                {session.user.username} ({session.user.role})
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
