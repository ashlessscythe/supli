"use server";

import { cookies } from "next/headers";
import { settingsService } from "@/server/services/settings.service";
import { env } from "@/lib/env";
import { KIOSK_SITE_COOKIE } from "@/lib/sites";
import {
  KIOSK_COOKIE,
  KIOSK_SESSION_MAX_AGE,
  computeKioskToken,
} from "@/lib/kiosk";

export async function kioskLogin(siteId: string, password: string) {
  if (!siteId) {
    return { success: false as const, error: "Site is required" };
  }

  const valid = await settingsService.verifyKioskPassword(siteId, password);
  if (!valid) {
    return { success: false as const, error: "Incorrect password" };
  }

  const hash = await settingsService.ensureKioskPasswordHash(siteId);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: KIOSK_SESSION_MAX_AGE,
  };

  const jar = await cookies();
  jar.set(KIOSK_COOKIE, computeKioskToken(hash), cookieOptions);
  jar.set(KIOSK_SITE_COOKIE, siteId, cookieOptions);

  return { success: true as const };
}

export async function kioskLogout() {
  const jar = await cookies();
  jar.delete(KIOSK_COOKIE);
  jar.delete(KIOSK_SITE_COOKIE);
  return { success: true as const };
}
