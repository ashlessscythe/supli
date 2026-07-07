import { z } from "zod";
import { settingsSchema } from "@/lib/validation/settings";
import { failure, success } from "@/lib/result";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { executeWithAudit } from "@/server/audit";

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
};
