import { prisma } from "@/lib/prisma";
import { RequestStatus } from "@prisma/client";
import type { TransactionClient } from "@/server/audit";

export const requestRepository = {
  findMany(where: Record<string, unknown> = {}) {
    return prisma.request.findMany({
      where,
      include: {
        supply: { select: { name: true, quantity: true } },
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string, siteId: string) {
    return prisma.request.findFirst({
      where: { id, siteId },
      include: { supply: true },
    });
  },

  findFirst(where: Record<string, unknown>) {
    return prisma.request.findFirst({
      where,
      include: {
        supply: true,
        user: { select: { username: true } },
      },
    });
  },

  create(
    data: {
      siteId: string;
      userId: string;
      supplyId: string;
      quantity: number;
      status?: RequestStatus;
    },
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.request.create({
      data: { ...data, status: data.status ?? RequestStatus.PENDING },
      include: {
        supply: { select: { name: true } },
        user: { select: { username: true } },
      },
    });
  },

  updateStatus(
    id: string,
    siteId: string,
    status: RequestStatus,
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.request.updateMany({
      where: { id, siteId },
      data: { status },
    });
  },
};
