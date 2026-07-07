"use server";

import { cookies } from "next/headers";
import { settingsService } from "@/server/services/settings.service";
import { env } from "@/lib/env";
import {
  KIOSK_COOKIE,
  KIOSK_SESSION_MAX_AGE,
  computeKioskToken,
} from "@/lib/kiosk";

export async function kioskLogin(password: string) {
  const valid = await settingsService.verifyKioskPassword(password);
  if (!valid) {
    return { success: false as const, error: "Incorrect password" };
  }

  const hash = await settingsService.ensureKioskPasswordHash();
  cookies().set(KIOSK_COOKIE, computeKioskToken(hash), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: KIOSK_SESSION_MAX_AGE,
  });

  return { success: true as const };
}

export async function kioskLogout() {
  cookies().delete(KIOSK_COOKIE);
  return { success: true as const };
}
