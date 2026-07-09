import { prisma } from "@/lib/prisma";

export const locationRepository = {
  findAll() {
    return prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { stockLevels: true } } },
    });
  },

  findAllAdmin() {
    return prisma.location.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { stockLevels: true } } },
    });
  },

  findById(id: string) {
    return prisma.location.findUnique({ where: { id } });
  },

  findDefault() {
    return prisma.location.findFirst({ where: { name: "Watchpoint Delta" } });
  },

  create(data: {
    name: string;
    type: string;
    description?: string;
  }) {
    return prisma.location.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      description: string | null;
      isActive: boolean;
    }>
  ) {
    return prisma.location.update({ where: { id }, data });
  },
};
