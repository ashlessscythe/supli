import { prisma } from "@/lib/prisma";

export const itemTypeRepository = {
  findAll() {
    return prisma.itemType.findMany({ orderBy: { name: "asc" } });
  },

  findBySlug(slug: string) {
    return prisma.itemType.findUnique({ where: { slug } });
  },
};
