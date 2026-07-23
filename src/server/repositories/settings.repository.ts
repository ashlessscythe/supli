import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/server/audit";

export const settingsRepository = {
  findAll(siteId: string) {
    return prisma.systemSetting.findMany({
      where: { siteId },
      orderBy: { key: "asc" },
    });
  },

  findByKey(siteId: string, key: string) {
    return prisma.systemSetting.findUnique({
      where: { siteId_key: { siteId, key } },
    });
  },

  upsertByKey(
    siteId: string,
    key: string,
    value: string,
    description: string,
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.systemSetting.upsert({
      where: { siteId_key: { siteId, key } },
      update: { value },
      create: { siteId, key, value, description },
    });
  },

  updateMany(
    siteId: string,
    settings: { id: string; value: string }[],
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return Promise.all(
      settings.map((setting) =>
        client.systemSetting.updateMany({
          where: { id: setting.id, siteId },
          data: { value: setting.value },
        })
      )
    );
  },
};
