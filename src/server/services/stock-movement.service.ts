import { z } from "zod";
import { StockMovementType, VendorReorderStatus } from "@prisma/client";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { locationRepository } from "@/server/repositories/location.repository";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { executeWithAudit, type TransactionClient } from "@/server/audit";
import { normalizeBarcode } from "@/lib/barcode";
import { notificationService } from "@/server/services/notification.service";
import {
  receiveStockSchema,
  adjustStockSchema,
  logVendorReorderSchema,
  updateVendorReorderSchema,
  type ReceiveStockInput,
  type AdjustStockInput,
  type LogVendorReorderInput,
  type UpdateVendorReorderInput,
} from "@/lib/validation/stock-movement";

const OPEN_VENDOR_REORDER_STATUSES = [
  VendorReorderStatus.ORDERED,
  VendorReorderStatus.PARTIALLY_RECEIVED,
] as const;

async function getReceivedQuantityForReorder(
  vendorReorderId: string,
  tx?: TransactionClient
) {
  const client = tx ?? prisma;
  const aggregate = await client.stockMovement.aggregate({
    where: {
      vendorReorderId,
      type: StockMovementType.RECEIVE,
    },
    _sum: { quantity: true },
  });
  return aggregate._sum.quantity ?? 0;
}

async function validateVendorReorderLink(
  supplyId: string,
  vendorReorderId: string,
  receiveQuantity: number
) {
  const reorder = await prisma.vendorReorder.findUnique({
    where: { id: vendorReorderId },
  });

  if (!reorder) {
    return failure("Open order not found");
  }

  if (reorder.supplyId !== supplyId) {
    return failure("Open order does not match the selected supply");
  }

  if (
    !OPEN_VENDOR_REORDER_STATUSES.includes(
      reorder.status as (typeof OPEN_VENDOR_REORDER_STATUSES)[number]
    )
  ) {
    return failure("Open order is no longer open for receiving");
  }

  const priorReceived = await getReceivedQuantityForReorder(vendorReorderId);
  const remaining = reorder.quantity - priorReceived;

  if (remaining <= 0) {
    return failure("Open order has no remaining quantity to receive");
  }

  if (receiveQuantity > remaining) {
    return failure(
      `Cannot receive more than ${remaining} remaining on this open order`
    );
  }

  return success(reorder);
}

const consumeSchema = z.object({
  barcode: z.string().min(1),
  quantity: z.number().int().positive(),
  locationId: z.string().optional(),
  badgeId: z.string().optional(),
});

function buildReceiveNotes(input: {
  notes?: string;
  externalPoRef?: string;
  vendorName?: string;
}) {
  const parts: string[] = [];
  if (input.externalPoRef?.trim()) {
    parts.push(`PO: ${input.externalPoRef.trim()}`);
  }
  if (input.vendorName) {
    parts.push(`Vendor: ${input.vendorName}`);
  }
  if (input.notes?.trim()) {
    parts.push(input.notes.trim());
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

function extractUserNotes(notes: string | null) {
  if (!notes) return null;
  const stripped = notes
    .split(" | ")
    .filter(
      (part) =>
        !part.startsWith("Vendor ID:") &&
        !part.startsWith("Vendor:") &&
        !part.startsWith("PO:")
    )
    .join(" | ")
    .trim();
  return stripped || null;
}

function extractLegacyVendorId(notes: string | null) {
  if (!notes) return null;
  const match = notes.match(/Vendor ID: (\S+)/);
  return match?.[1] ?? null;
}

async function resolveLocation(locationId?: string) {
  return (
    (locationId ? await locationRepository.findById(locationId) : null) ??
    (await locationRepository.findDefault())
  );
}

export const stockMovementService = {
  async consume(
    userId: string,
    input: z.infer<typeof consumeSchema>
  ) {
    try {
      const data = consumeSchema.parse(input);
      const location = await resolveLocation(data.locationId);

      if (!location) return failure("No location configured");

      const normalizedBarcode = normalizeBarcode(data.barcode);
      if (!normalizedBarcode) return failure("Item not found");

      const supply = await prisma.supply.findFirst({
        where: { barcode: normalizedBarcode },
      });

      if (!supply) return failure("Item not found");

      const level = await stockLevelRepository.findAtLocation(
        supply.id,
        location.id
      );

      if (!level || level.quantity < data.quantity) {
        return failure("Insufficient stock at this location");
      }

      const result = await executeWithAudit(
        userId,
        `Kiosk consumed ${data.quantity} ${supply.name}`,
        async (tx) => {
          await tx.stockLevel.update({
            where: {
              supplyId_locationId: {
                supplyId: supply.id,
                locationId: location.id,
              },
            },
            data: { quantity: { decrement: data.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              supplyId: supply.id,
              locationId: location.id,
              quantity: data.quantity,
              type: StockMovementType.CONSUME,
              badgeId: data.badgeId ?? null,
              userId,
            },
          });

          return stockLevelRepository.syncSupplyTotals(supply.id, tx);
        }
      );

      return success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to record consumption");
    }
  },

  async receive(userId: string, input: ReceiveStockInput) {
    try {
      const data = receiveStockSchema.parse(input);
      const supply = await supplyRepository.findById(data.supplyId);
      if (!supply) return failure("Supply not found");

      const location = await resolveLocation(data.locationId);
      if (!location) return failure("No location configured");

      if (data.vendorReorderId) {
        const linkValidation = await validateVendorReorderLink(
          data.supplyId,
          data.vendorReorderId,
          data.quantity
        );
        if (!linkValidation.success) {
          return linkValidation;
        }
      }

      let vendorName: string | undefined;
      if (data.vendorId) {
        const vendor = await prisma.vendor.findUnique({
          where: { id: data.vendorId },
          select: { name: true },
        });
        vendorName = vendor?.name;
      }

      const notes = buildReceiveNotes({
        notes: data.notes,
        externalPoRef: data.externalPoRef,
        vendorName,
      });

      const result = await executeWithAudit(
        userId,
        `Received ${data.quantity} ${supply.name} at ${location.name}`,
        async (tx) => {
          const existing = await tx.stockLevel.findUnique({
            where: {
              supplyId_locationId: {
                supplyId: supply.id,
                locationId: location.id,
              },
            },
          });

          if (existing) {
            await tx.stockLevel.update({
              where: {
                supplyId_locationId: {
                  supplyId: supply.id,
                  locationId: location.id,
                },
              },
              data: { quantity: { increment: data.quantity } },
            });
          } else {
            await tx.stockLevel.create({
              data: {
                supplyId: supply.id,
                locationId: location.id,
                quantity: data.quantity,
                minimumThreshold: supply.minimumThreshold,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              supplyId: supply.id,
              locationId: location.id,
              quantity: data.quantity,
              type: StockMovementType.RECEIVE,
              userId,
              notes,
              vendorReorderId: data.vendorReorderId ?? null,
            },
          });

          if (data.vendorReorderId) {
            const reorder = await tx.vendorReorder.findUnique({
              where: { id: data.vendorReorderId },
            });
            if (!reorder) {
              throw new Error("Open order not found");
            }

            const totalReceived = await getReceivedQuantityForReorder(
              reorder.id,
              tx
            );
            const status =
              totalReceived >= reorder.quantity
                ? VendorReorderStatus.RECEIVED
                : VendorReorderStatus.PARTIALLY_RECEIVED;

            await tx.vendorReorder.update({
              where: { id: reorder.id },
              data: {
                status,
                receivedAt:
                  status === VendorReorderStatus.RECEIVED
                    ? new Date()
                    : undefined,
              },
            });
          }

          return stockLevelRepository.syncSupplyTotals(supply.id, tx);
        }
      );

      return success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to record receipt");
    }
  },

  async adjust(userId: string, input: AdjustStockInput) {
    try {
      const data = adjustStockSchema.parse(input);
      const supply = await supplyRepository.findById(data.supplyId);
      if (!supply) return failure("Supply not found");

      const location = await resolveLocation(data.locationId);
      if (!location) return failure("No location configured");

      const existing = await stockLevelRepository.findAtLocation(
        supply.id,
        location.id
      );
      const priorQty = existing?.quantity ?? 0;

      if (priorQty === data.newQuantity) {
        return failure("Quantity is already at the requested count");
      }

      const movementQty = Math.abs(data.newQuantity - priorQty);
      const notes = `Cycle count: ${priorQty} → ${data.newQuantity}. ${data.reason}`;

      const result = await executeWithAudit(
        userId,
        `Adjusted ${supply.name} at ${location.name} to ${data.newQuantity}`,
        async (tx) => {
          await stockLevelRepository.upsert(
            supply.id,
            location.id,
            {
              quantity: data.newQuantity,
              minimumThreshold:
                existing?.minimumThreshold ?? supply.minimumThreshold,
            },
            tx
          );

          await tx.stockMovement.create({
            data: {
              supplyId: supply.id,
              locationId: location.id,
              quantity: movementQty,
              type: StockMovementType.ADJUST,
              userId,
              notes,
            },
          });

          const updated = await stockLevelRepository.syncSupplyTotals(
            supply.id,
            tx
          );

          if (updated.quantity <= updated.minimumThreshold) {
            await notificationService.notifyAdminsLowStock(
              updated.name,
              updated.quantity,
              updated.id
            );
          }

          return updated;
        }
      );

      return success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to adjust stock");
    }
  },

  async listReceipts(limit = 50) {
    try {
      const movements = await prisma.stockMovement.findMany({
        where: { type: StockMovementType.RECEIVE },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          supply: { select: { id: true, name: true } },
          location: { select: { name: true } },
          vendorReorder: {
            select: {
              externalPoNumber: true,
              vendor: { select: { id: true, name: true } },
            },
          },
        },
      });

      const legacyVendorIds = [
        ...new Set(
          movements
            .map((movement) => extractLegacyVendorId(movement.notes))
            .filter((id): id is string => !!id)
        ),
      ];
      const legacyVendors =
        legacyVendorIds.length > 0
          ? await prisma.vendor.findMany({
              where: { id: { in: legacyVendorIds } },
              select: { id: true, name: true },
            })
          : [];
      const legacyVendorMap = new Map(
        legacyVendors.map((vendor) => [vendor.id, vendor.name])
      );

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

      return success(
        movements.map((m) => {
          const legacyVendorId = extractLegacyVendorId(m.notes);
          const vendorName =
            m.vendorReorder?.vendor?.name ??
            (legacyVendorId
              ? legacyVendorMap.get(legacyVendorId) ?? null
              : null);

          return {
            id: m.id,
            createdAt: m.createdAt,
            quantity: m.quantity,
            notes: m.notes,
            supply: m.supply,
            location: m.location,
            username: m.userId ? userMap.get(m.userId) ?? "Unknown" : "System",
            externalPoNumber: m.vendorReorder?.externalPoNumber ?? null,
            vendorName,
            userNotes: extractUserNotes(m.notes),
          };
        })
      );
    } catch {
      return failure("Failed to fetch receipts");
    }
  },

  async logVendorReorder(userId: string, input: LogVendorReorderInput) {
    try {
      const data = logVendorReorderSchema.parse(input);
      const supply = await supplyRepository.findById(data.supplyId);
      if (!supply) return failure("Supply not found");

      const reorder = await executeWithAudit(
        userId,
        `Logged external order for ${data.quantity} ${supply.name}`,
        (tx) =>
          tx.vendorReorder.create({
            data: {
              supplyId: data.supplyId,
              vendorId: data.vendorId ?? null,
              quantity: data.quantity,
              externalPoNumber: data.externalPoNumber?.trim() || null,
              notes: data.notes?.trim() || null,
              createdById: userId,
            },
          })
      );

      return success(reorder);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to log vendor order");
    }
  },

  async listOpenVendorReorders() {
    try {
      const reorders = await prisma.vendorReorder.findMany({
        where: {
          status: {
            in: [...OPEN_VENDOR_REORDER_STATUSES],
          },
        },
        orderBy: { orderedAt: "desc" },
        include: {
          supply: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
          stockMovements: {
            where: { type: StockMovementType.RECEIVE },
            select: { quantity: true },
          },
        },
      });
      return success(
        reorders.map((reorder) => {
          const receivedQuantity = reorder.stockMovements.reduce(
            (sum, movement) => sum + movement.quantity,
            0
          );
          return {
            id: reorder.id,
            quantity: reorder.quantity,
            externalPoNumber: reorder.externalPoNumber,
            status: reorder.status,
            orderedAt: reorder.orderedAt,
            notes: reorder.notes,
            vendorId: reorder.vendorId,
            supply: reorder.supply,
            vendor: reorder.vendor,
            receivedQuantity,
            remainingQuantity: Math.max(0, reorder.quantity - receivedQuantity),
          };
        })
      );
    } catch {
      return failure("Failed to fetch vendor reorders");
    }
  },

  async updateVendorReorder(
    userId: string,
    reorderId: string,
    input: UpdateVendorReorderInput
  ) {
    try {
      const data = updateVendorReorderSchema.parse(input);
      const existing = await prisma.vendorReorder.findUnique({
        where: { id: reorderId },
        include: {
          supply: { select: { name: true } },
          stockMovements: {
            where: { type: StockMovementType.RECEIVE },
            select: { quantity: true },
          },
        },
      });

      if (!existing) return failure("Open order not found");

      if (
        !OPEN_VENDOR_REORDER_STATUSES.includes(
          existing.status as (typeof OPEN_VENDOR_REORDER_STATUSES)[number]
        )
      ) {
        return failure("Only open orders can be edited");
      }

      const receivedQuantity = existing.stockMovements.reduce(
        (sum, movement) => sum + movement.quantity,
        0
      );

      if (data.quantity < receivedQuantity) {
        return failure(
          `Quantity cannot be less than ${receivedQuantity} already received`
        );
      }

      const reorder = await executeWithAudit(
        userId,
        `Updated open order for ${existing.supply.name}`,
        (tx) =>
          tx.vendorReorder.update({
            where: { id: reorderId },
            data: {
              quantity: data.quantity,
              vendorId:
                data.vendorId !== undefined ? data.vendorId : existing.vendorId,
              externalPoNumber:
                data.externalPoNumber !== undefined
                  ? data.externalPoNumber?.trim() || null
                  : existing.externalPoNumber,
              notes:
                data.notes !== undefined
                  ? data.notes?.trim() || null
                  : existing.notes,
              status:
                receivedQuantity > 0 &&
                receivedQuantity < data.quantity
                  ? VendorReorderStatus.PARTIALLY_RECEIVED
                  : receivedQuantity >= data.quantity
                    ? VendorReorderStatus.RECEIVED
                    : VendorReorderStatus.ORDERED,
              receivedAt:
                receivedQuantity >= data.quantity ? new Date() : null,
            },
          })
      );

      return success(reorder);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update open order");
    }
  },

  async getConsumptionHistory(supplyId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.stockMovement.findMany({
      where: {
        supplyId,
        type: StockMovementType.CONSUME,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      include: { location: { select: { name: true } } },
    });
  },
};
