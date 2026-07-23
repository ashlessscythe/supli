"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { getAdminRoutes } from "./admin-nav";

export function AdminMobileNav({ role }: { role?: Role | string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const routes = getAdminRoutes(role);

  const current =
    routes.find((route) => route.href === pathname)?.title ?? "Admin";

  return (
    <div className="md:hidden">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>{current}</span>
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[calc(100vw-2rem)] max-w-sm"
        >
          {routes.map((route) => (
            <DropdownMenuItem key={route.href} asChild>
              <Link
                href={route.href}
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
