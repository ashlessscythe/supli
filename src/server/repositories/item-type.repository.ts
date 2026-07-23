import { prisma } from "@/lib/prisma";

export const itemTypeRepository = {
  findAll(siteId: string) {
    return prisma.itemType.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
    });
  },

  findBySlug(siteId: string, slug: string) {
    return prisma.itemType.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });
  },
};
