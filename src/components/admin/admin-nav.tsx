"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Users,
  BarChart3,
  Package,
  Settings,
  History,
  MapPin,
  Truck,
  PackagePlus,
  Search,
  Building2,
} from "lucide-react";
import { adminNavigationItems } from "@/lib/nav-config";

const adminIcons = {
  Overview: BarChart3,
  Supplies: Package,
  Inbound: PackagePlus,
  History: Search,
  Locations: MapPin,
  Vendors: Truck,
  Users: Users,
  "Audit Log": History,
  Settings: Settings,
  Sites: Building2,
} as const;

export const adminRoutes = adminNavigationItems.map((route) => ({
  ...route,
  icon: adminIcons[route.title as keyof typeof adminIcons],
}));

const sitesRoute = {
  title: "Sites",
  href: "/admin/sites",
  icon: Building2,
} as const;

export function getAdminRoutes(role?: Role | string) {
  if (role === Role.SUPERADMIN || role === "SUPERADMIN") {
    return [sitesRoute, ...adminRoutes];
  }
  return adminRoutes;
}

export function AdminNav({
  onNavigate,
  role,
}: {
  onNavigate?: () => void;
  role?: Role | string;
}) {
  const pathname = usePathname();
  const routes = getAdminRoutes(role);

  return (
    <nav className="grid items-start gap-2">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          onClick={onNavigate}
          className={cn(
            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            pathname === route.href
              ? "bg-accent text-accent-foreground"
              : "transparent"
          )}
        >
          <route.icon className="mr-2 h-4 w-4" />
          <span>{route.title}</span>
        </Link>
      ))}
    </nav>
  );
}
