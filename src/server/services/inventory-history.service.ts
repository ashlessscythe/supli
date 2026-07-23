import { Prisma, StockMovementType, VendorReorderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/result";
import {
  inventoryHistorySearchSchema,
  type InventoryHistoryItem,
  type InventoryHistorySearchInput,
} from "@/lib/validation/inventory-history";

function parseDayBound(value: string | undefined, endOfDay: boolean) {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function isVendorReorderStatus(
  value: string | undefined
): value is VendorReorderStatus {
  return (
    !!value &&
    (Object.values(VendorReorderStatus) as string[]).includes(value)
  );
}

export const inventoryHistoryService = {
  async search(siteId: string, input: InventoryHistorySearchInput) {
    try {
      const data = inventoryHistorySearchSchema.parse(input);
      const term = data.q?.trim() ?? "";
      const from = parseDayBound(data.from, false);
      const to = parseDayBound(data.to, true);
      const statusFilter = isVendorReorderStatus(data.status)
        ? data.status
        : undefined;

      // Order status only applies to orders. If set with kind=all, search orders only.
      const includeOrders =
        data.kind === "all" || data.kind === "order"
          ? true
          : false;
      const includeReceipts =
        !statusFilter && (data.kind === "all" || data.kind === "receipt");
      const includeConsumptions =
        !statusFilter && (data.kind === "all" || data.kind === "consumption");

      const results: InventoryHistoryItem[] = [];

      if (includeOrders) {
        const orders = await prisma.vendorReorder.findMany({
          where: {
            supply: { siteId },
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(from || to
              ? {
                  orderedAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
            ...(term
              ? {
                  OR: [
                    {
                      supply: {
                        name: { contains: term, mode: "insensitive" },
                      },
                    },
                    {
                      vendor: {
                        name: { contains: term, mode: "insensitive" },
                      },
                    },
                    {
                      externalPoNumber: {
                        contains: term,
                        mode: "insensitive",
                      },
                    },
                    { notes: { contains: term, mode: "insensitive" } },
                    {
                      createdBy: {
                        username: { contains: term, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {}),
          },
          orderBy: { orderedAt: "desc" },
          take: data.limit,
          include: {
            supply: { select: { id: true, name: true } },
            vendor: { select: { name: true } },
            createdBy: { select: { username: true } },
          },
        });

        for (const order of orders) {
          results.push({
            id: `order:${order.id}`,
            kind: "order",
            date: order.orderedAt.toISOString(),
            supplyId: order.supply.id,
            supplyName: order.supply.name,
            quantity: order.quantity,
            locationName: null,
            vendorName: order.vendor?.name ?? null,
            externalPoNumber: order.externalPoNumber,
            status: order.status,
            notes: order.notes,
            username: order.createdBy.username,
          });
        }
      }

      if (includeReceipts || includeConsumptions) {
        const movementTypes: StockMovementType[] = [];
        if (includeReceipts) movementTypes.push(StockMovementType.RECEIVE);
        if (includeConsumptions) movementTypes.push(StockMovementType.CONSUME);

        const movements = await prisma.stockMovement.findMany({
          where: {
            supply: { siteId },
            type: { in: movementTypes },
            ...(from || to
              ? {
                  createdAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
            ...(term
              ? {
                  OR: [
                    {
                      supply: {
                        name: { contains: term, mode: "insensitive" },
                      },
                    },
                    {
                      location: {
                        name: { contains: term, mode: "insensitive" },
                      },
                    },
                    { notes: { contains: term, mode: "insensitive" } },
                    {
                      vendorReorder: {
                        OR: [
                          {
                            externalPoNumber: {
                              contains: term,
                              mode: "insensitive",
                            },
                          },
                          {
                            vendor: {
                              name: { contains: term, mode: "insensitive" },
                            },
                          },
                        ],
                      },
                    },
                  ] satisfies Prisma.StockMovementWhereInput["OR"],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: data.limit,
          include: {
            supply: { select: { id: true, name: true } },
            location: { select: { name: true } },
            vendorReorder: {
              select: {
                externalPoNumber: true,
                vendor: { select: { name: true } },
              },
            },
          },
        });

        const userIds = [
          ...new Set(
            movements.map((m) => m.userId).filter((id): id is string => !!id)
          ),
        ];
        const users =
          userIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, username: true },
              })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u.username]));

        for (const movement of movements) {
          const kind =
            movement.type === StockMovementType.RECEIVE
              ? ("receipt" as const)
              : ("consumption" as const);

          results.push({
            id: `${kind}:${movement.id}`,
            kind,
            date: movement.createdAt.toISOString(),
            supplyId: movement.supply.id,
            supplyName: movement.supply.name,
            quantity: movement.quantity,
            locationName: movement.location.name,
            vendorName: movement.vendorReorder?.vendor?.name ?? null,
            externalPoNumber:
              movement.vendorReorder?.externalPoNumber ?? null,
            status: null,
            notes: movement.notes,
            username: movement.userId
              ? userMap.get(movement.userId) ?? "Unknown"
              : null,
          });
        }
      }

      results.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return success(results.slice(0, data.limit));
    } catch {
      return failure("Failed to search inventory history");
    }
  },
};
