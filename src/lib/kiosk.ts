import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { settingsService } from "@/server/services/settings.service";
import { KIOSK_SITE_COOKIE, kioskUsernameForSlug } from "@/lib/sites";
import {
  KIOSK_COOKIE,
  KIOSK_USERNAME,
  KIOSK_SESSION_MAX_AGE,
} from "@/lib/kiosk-constants";

export { KIOSK_COOKIE, KIOSK_USERNAME, KIOSK_SESSION_MAX_AGE };

/**
 * Derives the kiosk session token from the current password hash. Because the
 * token is bound to the hash, changing the kiosk password automatically
 * invalidates any existing kiosk sessions.
 */
export function computeKioskToken(passwordHash: string): string {
  return crypto
    .createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(`kiosk:${passwordHash}`)
    .digest("hex");
}

export async function isKioskAuthenticated(): Promise<boolean> {
  const token = cookies().get(KIOSK_COOKIE)?.value;
  const siteId = cookies().get(KIOSK_SITE_COOKIE)?.value;
  if (!token || !siteId) return false;

  const hash = await settingsService.getKioskPasswordHash(siteId);
  if (!hash) return false;

  const expected = computeKioskToken(hash);
  try {
    const provided = Buffer.from(token);
    const valid = Buffer.from(expected);
    return (
      provided.length === valid.length &&
      crypto.timingSafeEqual(provided, valid)
    );
  } catch {
    return false;
  }
}

export async function getKioskSite(): Promise<{
  id: string;
  name: string;
  slug: string;
} | null> {
  const siteId = cookies().get(KIOSK_SITE_COOKIE)?.value;
  if (!siteId) return null;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, slug: true },
  });
  return site;
}

/**
 * Resolves the dedicated kiosk system user for a site, creating it on first use.
 * All kiosk consumption is attributed to this user in the audit trail.
 */
export async function getKioskUserId(siteId?: string): Promise<string> {
  const resolvedSiteId =
    siteId ?? cookies().get(KIOSK_SITE_COOKIE)?.value ?? null;
  if (!resolvedSiteId) {
    throw new Error("No kiosk site selected");
  }

  const site = await prisma.site.findUnique({
    where: { id: resolvedSiteId },
    select: { id: true, slug: true },
  });
  if (!site) {
    throw new Error("Kiosk site not found");
  }

  const username = kioskUsernameForSlug(site.slug);
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing) return existing.id;

  const randomPassword = await bcrypt.hash(
    crypto.randomBytes(24).toString("hex"),
    10
  );
  const created = await prisma.user.create({
    data: {
      username,
      password: randomPassword,
      role: Role.STAFF,
      siteId: site.id,
    },
    select: { id: true },
  });
  return created.id;
}
