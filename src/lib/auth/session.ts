import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
  siteId: string | null;
};

export type SiteContext = {
  userId: string;
  username: string;
  role: Role;
  /** Effective site the actor is operating in. */
  siteId: string;
  /** True when a SUPERADMIN is acting inside a switched site. */
  isSuperAdmin: boolean;
};

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Site admin OR superadmin currently switched into a site.
 * Superadmins without an active site are rejected here.
 */
export async function requireAdmin() {
  const ctx = await requireSiteContext();
  if (ctx.role !== Role.ADMIN && ctx.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

/**
 * Page-safe admin gate: redirects SUPERADMIN to the sites picker when no
 * active site is selected, instead of throwing (which races layout redirects
 * and surfaces as a client-side error during parallel RSC render).
 */
export async function requireAdminPage() {
  const session = await requireSession();
  if (
    session.user.role !== Role.ADMIN &&
    session.user.role !== Role.SUPERADMIN
  ) {
    throw new Error("Unauthorized");
  }

  const ctx = await getSiteContext();
  if (!ctx) {
    if (session.user.role === Role.SUPERADMIN) {
      redirect("/admin/sites");
    }
    throw new Error("Unauthorized");
  }

  if (ctx.role !== Role.ADMIN && ctx.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

/**
 * Resolves the effective site for the current actor.
 * - ADMIN / STAFF / PENDING: home siteId (required)
 * - SUPERADMIN: active site cookie (required for site-scoped ops)
 */
export async function requireSiteContext(): Promise<SiteContext> {
  const session = await requireSession();
  const { id, username, role, siteId } = session.user;

  if (role === Role.SUPERADMIN) {
    const activeSiteId = (await cookies()).get(ACTIVE_SITE_COOKIE)?.value;
    if (!activeSiteId) {
      throw new Error("No active site selected");
    }
    return {
      userId: id,
      username,
      role,
      siteId: activeSiteId,
      isSuperAdmin: true,
    };
  }

  if (!siteId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: id,
    username,
    role,
    siteId,
    isSuperAdmin: false,
  };
}

/** Soft resolve: returns null instead of throwing when no site context. */
export async function getSiteContext(): Promise<SiteContext | null> {
  try {
    return await requireSiteContext();
  } catch {
    return null;
  }
}

export async function getActiveSiteIdForSession(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role === Role.SUPERADMIN) {
    return (await cookies()).get(ACTIVE_SITE_COOKIE)?.value ?? null;
  }
  return session.user.siteId;
}
