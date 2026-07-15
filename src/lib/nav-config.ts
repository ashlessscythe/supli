export const staffNavigationItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Supplies", href: "/dashboard/supplies" },
  { name: "Inbound", href: "/dashboard/inbound" },
] as const;

export const adminNavigationItems = [
  { title: "Overview", href: "/admin" },
  { title: "Supplies", href: "/admin/supplies" },
  { title: "Inbound", href: "/admin/inbound" },
  { title: "Locations", href: "/admin/locations" },
  { title: "Vendors", href: "/admin/vendors" },
  { title: "Users", href: "/admin/users" },
  { title: "Audit Log", href: "/admin/audit" },
  { title: "Settings", href: "/admin/settings" },
] as const;
