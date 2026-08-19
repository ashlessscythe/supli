import { prisma } from "@/lib/prisma";
import type { Supply } from "@prisma/client";
import type { TransactionClient } from "@/server/audit";

export const supplyRepository = {
  findAll(siteId: string): Promise<Supply[]> {
    return prisma.supply.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
    });
  },

  findById(id: string, siteId: string) {
    return prisma.supply.findFirst({
      where: { id, siteId },
      include: {
        requests: {
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  },

  findDetails(id: string, siteId: string) {
    return prisma.supply.findFirst({
      where: { id, siteId },
      include: {
        itemType: { select: { name: true, slug: true } },
        stockLevels: {
          where: { location: { isActive: true } },
          include: { location: { select: { name: true } } },
          orderBy: { location: { name: "asc" } },
        },
        itemVendors: {
          include: {
            vendor: {
              select: { id: true, name: true, contact: true, website: true },
            },
          },
          orderBy: [{ isPreferred: "desc" }, { vendor: { name: "asc" } }],
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            location: { select: { name: true } },
            vendorReorder: { select: { externalPoNumber: true } },
          },
        },
        requests: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { username: true } } },
        },
        vendorReorders: {
          where: {
            status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] },
          },
          orderBy: { orderedAt: "desc" },
          include: { vendor: { select: { name: true } } },
        },
      },
    });
  },

  create(
    data: {
      siteId: string;
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
    siteId: string,
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
    return client.supply.updateMany({
      where: { id, siteId },
      data,
    });
  },

  delete(id: string, siteId: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    return client.supply.deleteMany({ where: { id, siteId } });
  },

  hasPendingRequests(supplyId: string, siteId: string) {
    return prisma.request.findFirst({
      where: { supplyId, siteId, status: "PENDING" },
    });
  },

  async hasRemainingStock(supplyId: string, siteId: string) {
    const supply = await prisma.supply.findFirst({
      where: { id: supplyId, siteId },
      select: {
        quantity: true,
        stockLevels: {
          where: { quantity: { gt: 0 } },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!supply) return false;
    return supply.quantity > 0 || supply.stockLevels.length > 0;
  },

  hasOpenOrders(supplyId: string, siteId: string) {
    return prisma.vendorReorder.findFirst({
      where: {
        supplyId,
        supply: { siteId },
        status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] },
      },
    });
  },

  decrementQuantity(
    id: string,
    siteId: string,
    amount: number,
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.supply.updateMany({
      where: { id, siteId },
      data: { quantity: { decrement: amount } },
    });
  },

  findByBarcode(barcode: string, siteId: string) {
    return prisma.supply.findFirst({
      where: { barcode, siteId },
      select: { id: true, name: true, barcode: true },
    });
  },
};
