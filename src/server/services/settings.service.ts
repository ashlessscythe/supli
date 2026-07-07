import { z } from "zod";
import bcrypt from "bcrypt";
import { settingsSchema } from "@/lib/validation/settings";
import { failure, success } from "@/lib/result";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { executeWithAudit } from "@/server/audit";

export const KIOSK_PASSWORD_KEY = "KIOSK_PASSWORD_HASH";
export const KIOSK_PASSWORD_DESCRIPTION =
  "Password required to access the kiosk terminal";
export const DEFAULT_KIOSK_PASSWORD = "kiosk1234";

export const settingsService = {
  async list() {
    try {
      const settings = await settingsRepository.findAll();
      return success(settings);
    } catch {
      return failure("Failed to fetch settings");
    }
  },

  async update(
    actorId: string,
    settings: z.infer<typeof settingsSchema>
  ) {
    try {
      const data = settingsSchema.parse(settings);
      await executeWithAudit(actorId, "Updated system settings", (tx) =>
        settingsRepository.updateMany(
          data.map((s) => ({ id: s.id, value: s.value })),
          tx
        )
      );
      return success({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update settings");
    }
  },

  async getSetting(key: string): Promise<string | null> {
    const setting = await settingsRepository.findByKey(key);
    return setting?.value ?? null;
  },

  async shouldShowAllRequests(): Promise<boolean> {
    const value = await this.getSetting("ALLOW_ALL_REQUESTS_VISIBLE");
    return value === "true";
  },

  async getMaxRequestQuantity(): Promise<number> {
    const value = await this.getSetting("MAX_REQUEST_QUANTITY");
    return value ? parseInt(value, 10) : 100;
  },

  async getLowStockThreshold(): Promise<number> {
    const value = await this.getSetting("LOW_STOCK_THRESHOLD_WARNING");
    return value ? parseInt(value, 10) : 5;
  },

  async getKioskPasswordHash(): Promise<string | null> {
    return this.getSetting(KIOSK_PASSWORD_KEY);
  },

  async ensureKioskPasswordHash(): Promise<string> {
    const existing = await this.getKioskPasswordHash();
    if (existing) return existing;
    const hash = await bcrypt.hash(DEFAULT_KIOSK_PASSWORD, 10);
    await settingsRepository.upsertByKey(
      KIOSK_PASSWORD_KEY,
      hash,
      KIOSK_PASSWORD_DESCRIPTION
    );
    return hash;
  },

  async verifyKioskPassword(plain: string): Promise<boolean> {
    if (!plain) return false;
    const hash = await this.ensureKioskPasswordHash();
    return bcrypt.compare(plain, hash);
  },

  async setKioskPassword(actorId: string, plain: string) {
    try {
      if (!plain || plain.length < 4) {
        return failure("Kiosk password must be at least 4 characters");
      }
      const hash = await bcrypt.hash(plain, 10);
      await executeWithAudit(actorId, "Updated kiosk password", (tx) =>
        settingsRepository.upsertByKey(
          KIOSK_PASSWORD_KEY,
          hash,
          KIOSK_PASSWORD_DESCRIPTION,
          tx
        )
      );
      return success({ success: true });
    } catch {
      return failure("Failed to update kiosk password");
    }
  },
};
