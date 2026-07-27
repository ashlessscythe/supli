import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  const session = await getServerSession(authOptions);
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
 * Resolves the effective site for the current actor.
 * - ADMIN / STAFF / PENDING: home siteId (required)
 * - SUPERADMIN: active site cookie (required for site-scoped ops)
 */
export async function requireSiteContext(): Promise<SiteContext> {
  const session = await requireSession();
  const { id, username, role, siteId } = session.user;

  if (role === Role.SUPERADMIN) {
    const activeSiteId = cookies().get(ACTIVE_SITE_COOKIE)?.value;
    if (!activeSiteId) {
      // #region agent log
      fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'B',location:'session.ts:requireSiteContext',message:'throwing No active site selected for SUPERADMIN',data:{role,userId:id},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  if (session.user.role === Role.SUPERADMIN) {
    return cookies().get(ACTIVE_SITE_COOKIE)?.value ?? null;
  }
  return session.user.siteId;
}
