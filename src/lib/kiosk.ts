import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { settingsService } from "@/server/services/settings.service";
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
  if (!token) return false;

  const hash = await settingsService.getKioskPasswordHash();
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

/**
 * Resolves the dedicated kiosk system user, creating it on first use. All
 * kiosk consumption is attributed to this user in the audit trail.
 */
export async function getKioskUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { username: KIOSK_USERNAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const created = await prisma.user.create({
    data: {
      username: KIOSK_USERNAME,
      password: randomPassword,
      role: Role.STAFF,
    },
    select: { id: true },
  });
  return created.id;
}
