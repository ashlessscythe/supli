"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { isValidTheme, type ThemeName } from "@/lib/themes";

export async function getThemePreference(): Promise<ThemeName> {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { themePreference: true },
    });
    const pref = user?.themePreference ?? "system";
    return isValidTheme(pref) ? pref : "system";
  } catch {
    return "system";
  }
}

export async function setThemePreference(theme: ThemeName) {
  try {
    const session = await requireSession();
    if (!isValidTheme(theme)) {
      return { success: false as const, error: "Invalid theme" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { themePreference: theme },
    });

    revalidatePath("/", "layout");
    return { success: true as const, data: theme };
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
