import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/server/audit";

export const settingsRepository = {
  findAll() {
    return prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  },

  findByKey(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  },

  updateMany(
    settings: { id: string; value: string }[],
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return Promise.all(
      settings.map((setting) =>
        client.systemSetting.update({
          where: { id: setting.id },
          data: { value: setting.value },
        })
      )
    );
  },
};
