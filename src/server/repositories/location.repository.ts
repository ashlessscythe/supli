import { prisma } from "@/lib/prisma";

export const locationRepository = {
  findAll(siteId: string) {
    return prisma.location.findMany({
      where: { siteId, isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { stockLevels: true } } },
    });
  },

  findAllAdmin(siteId: string) {
    return prisma.location.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
      include: { _count: { select: { stockLevels: true } } },
    });
  },

  findById(id: string, siteId: string) {
    return prisma.location.findFirst({ where: { id, siteId } });
  },

  findActiveById(id: string, siteId: string) {
    return prisma.location.findFirst({
      where: { id, siteId, isActive: true },
    });
  },

  findDefault(siteId: string) {
    return prisma.location.findFirst({
      where: { siteId, name: "Watchpoint Delta", isActive: true },
    });
  },

  create(data: {
    siteId: string;
    name: string;
    type: string;
    description?: string;
  }) {
    return prisma.location.create({ data });
  },

  update(
    id: string,
    siteId: string,
    data: Partial<{
      name: string;
      type: string;
      description: string | null;
      isActive: boolean;
    }>
  ) {
    return prisma.location.updateMany({ where: { id, siteId }, data });
  },
};
