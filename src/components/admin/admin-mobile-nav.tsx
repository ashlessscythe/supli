"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleNavReselectClick } from "@/lib/nav-reselect";
import { getAdminRoutes } from "./admin-nav";

export function AdminMobileNav({ role }: { role?: Role | string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const routes = getAdminRoutes(role);

  const current =
    routes.find((route) => route.href === pathname)?.title ?? "Admin";

  return (
    <div className="md:hidden">
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full justify-between px-3"
          >
            <span className="truncate text-sm font-medium">{current}</span>
            <Menu className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="z-[60] w-[min(24rem,calc(100vw-2rem))]"
        >
          {routes.map((route) => (
            <DropdownMenuItem key={route.href} asChild>
              <Link
                href={route.href}
                onClick={(event) =>
                  handleNavReselectClick(event, {
                    href: route.href,
                    pathname,
                    replace: router.replace,
                    onNavigate: () => setOpen(false),
                  })
                }
                className={cn(
                  "flex items-center",
                  pathname === route.href &&
                    "bg-accent text-accent-foreground"
                )}
              >
                <route.icon className="mr-2 h-4 w-4" />
                <span>{route.title}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
