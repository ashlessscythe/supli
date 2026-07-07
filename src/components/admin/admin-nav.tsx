"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  BarChart3,
  ClipboardList,
  Package,
  Settings,
  History,
  MapPin,
  Truck,
} from "lucide-react";

export const adminRoutes = [
  {
    title: "Overview",
    href: "/admin",
    icon: BarChart3,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Supplies",
    href: "/admin/supplies",
    icon: Package,
  },
  {
    title: "Locations",
    href: "/admin/locations",
    icon: MapPin,
  },
  {
    title: "Vendors",
    href: "/admin/vendors",
    icon: Truck,
  },
  {
    title: "Requests",
    href: "/admin/requests",
    icon: ClipboardList,
  },
  {
    title: "Audit Log",
    href: "/admin/audit",
    icon: History,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

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
            pathname === route.href ? "bg-accent" : "transparent"
          )}
        >
          <route.icon className="mr-2 h-4 w-4" />
          <span>{route.title}</span>
        </Link>
      ))}
    </nav>
  );
}
