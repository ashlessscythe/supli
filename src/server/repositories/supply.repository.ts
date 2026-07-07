import { prisma } from "@/lib/prisma";
import type { Supply } from "@prisma/client";
import type { TransactionClient } from "@/server/audit";

export const supplyRepository = {
  findAll(): Promise<Supply[]> {
    return prisma.supply.findMany({ orderBy: { name: "asc" } });
  },

  findById(id: string) {
    return prisma.supply.findUnique({
      where: { id },
      include: {
        requests: {
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  },

  create(
    data: {
      name: string;
      description: string;
      quantity: number;
      minimumThreshold: number;
      barcode?: string | null;
      internalSku?: string | null;
      itemTypeId?: string | null;
    },
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.supply.create({ data });
  },

  update(
    id: string,
    data: Partial<
      Pick<
        Supply,
        | "name"
        | "description"
        | "quantity"
        | "minimumThreshold"
        | "barcode"
        | "internalSku"
      >
    >,
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.supply.update({ where: { id }, data });
  },

  delete(id: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    return client.supply.delete({ where: { id } });
  },

  hasPendingRequests(supplyId: string) {
    return prisma.request.findFirst({
      where: { supplyId, status: "PENDING" },
    });
  },

  decrementQuantity(id: string, amount: number, tx?: TransactionClient) {
    const client = tx ?? prisma;
    return client.supply.update({
      where: { id },
      data: { quantity: { decrement: amount } },
    });
  },
};
