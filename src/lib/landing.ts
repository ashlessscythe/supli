import type { Session } from "next-auth";

export function getAppHomeHref(session: Session | null): string {
  if (!session?.user) return "/register";
  return session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    ? "/admin"
    : "/dashboard";
}

export function getGetStartedHref(session: Session | null): string {
  if (!session?.user) return "/register";
  return getAppHomeHref(session);
}
