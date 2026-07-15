"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { adminNavigationItems } from "@/lib/nav-config";

const adminIcons = {
  Overview: BarChart3,
  Supplies: Package,
  Inbound: PackagePlus,
  Locations: MapPin,
  Vendors: Truck,
  Users: Users,
  "Audit Log": History,
  Settings: Settings,
} as const;

export const adminRoutes = adminNavigationItems.map((route) => ({
  ...route,
  icon: adminIcons[route.title],
}));

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
      {adminRoutes.map((route) => (
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
