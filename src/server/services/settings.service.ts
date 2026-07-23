import { z } from "zod";
import bcrypt from "bcrypt";
import { settingsSchema } from "@/lib/validation/settings";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { executeWithAudit } from "@/server/audit";

export const DEFAULT_KIOSK_PASSWORD = "kiosk1234";

export const settingsService = {
  async list(siteId: string) {
    try {
      const settings = await settingsRepository.findAll(siteId);
      return success(settings);
    } catch {
      return failure("Failed to fetch settings");
    }
  },

  async update(
    actorId: string,
    siteId: string,
    settings: z.infer<typeof settingsSchema>
  ) {
    try {
      const data = settingsSchema.parse(settings);
      await executeWithAudit(
        actorId,
        "Updated system settings",
        (tx) =>
          settingsRepository.updateMany(
            siteId,
            data.map((s) => ({ id: s.id, value: s.value })),
            tx
          ),
        siteId
      );
      return success({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update settings");
    }
  },

  async getSetting(siteId: string, key: string): Promise<string | null> {
    const setting = await settingsRepository.findByKey(siteId, key);
    return setting?.value ?? null;
  },

  async shouldShowAllRequests(siteId: string): Promise<boolean> {
    const value = await this.getSetting(siteId, "ALLOW_ALL_REQUESTS_VISIBLE");
    return value === "true";
  },

  async getMaxRequestQuantity(siteId: string): Promise<number> {
    const value = await this.getSetting(siteId, "MAX_REQUEST_QUANTITY");
    return value ? parseInt(value, 10) : 100;
  },

  async getLowStockThreshold(siteId: string): Promise<number> {
    const value = await this.getSetting(siteId, "LOW_STOCK_THRESHOLD_WARNING");
    return value ? parseInt(value, 10) : 5;
  },

  async getKioskPasswordHash(siteId: string): Promise<string | null> {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { kioskPasswordHash: true },
    });
    return site?.kioskPasswordHash ?? null;
  },

  async ensureKioskPasswordHash(siteId: string): Promise<string> {
    const existing = await this.getKioskPasswordHash(siteId);
    if (existing) return existing;
    const hash = await bcrypt.hash(DEFAULT_KIOSK_PASSWORD, 10);
    await prisma.site.update({
      where: { id: siteId },
      data: { kioskPasswordHash: hash },
    });
    return hash;
  },

  async verifyKioskPassword(siteId: string, plain: string): Promise<boolean> {
    if (!plain) return false;
    const hash = await this.ensureKioskPasswordHash(siteId);
    return bcrypt.compare(plain, hash);
  },

  async setKioskPassword(actorId: string, siteId: string, plain: string) {
    try {
      if (!plain || plain.length < 4) {
        return failure("Kiosk password must be at least 4 characters");
      }
      const hash = await bcrypt.hash(plain, 10);
      await executeWithAudit(
        actorId,
        "Updated kiosk password",
        (tx) =>
          tx.site.update({
            where: { id: siteId },
            data: { kioskPasswordHash: hash },
          }),
        siteId
      );
      return success({ success: true });
    } catch {
      return failure("Failed to update kiosk password");
    }
  },
};
