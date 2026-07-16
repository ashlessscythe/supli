import { z } from "zod";
import { StockMovementType, VendorReorderStatus } from "@prisma/client";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { locationRepository } from "@/server/repositories/location.repository";
import { supplyRepository } from "@/server/repositories/supply.repository";
import {
  executeWithAudit,
  executeWithAudits,
  type TransactionClient,
} from "@/server/audit";
import { normalizeBarcode } from "@/lib/barcode";
import { notificationService } from "@/server/services/notification.service";
import { fileService } from "@/server/services/file.service";
import {
  receiveStockSchema,
  adjustStockSchema,
  logVendorReorderSchema,
  updateVendorReorderSchema,
  type ReceiveStockInput,
  type AdjustStockInput,
  bulkConsumeSchema,
  type LogVendorReorderInput,
  type UpdateVendorReorderInput,
  type BulkConsumeInput,
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
  if (locationId) {
    return locationRepository.findActiveById(locationId);
  }
  return locationRepository.findDefault();
}

async function canFulfillAtLocation(
  locationId: string,
  items: { supplyId: string; quantity: number }[]
) {
  for (const item of items) {
    const level = await stockLevelRepository.findAtLocation(
      item.supplyId,
      locationId
    );
    if (!level || level.quantity < item.quantity) {
      return false;
    }
  }
  return true;
}

async function resolveCheckoutLocation(
  items: { supplyId: string; quantity: number }[],
  locationId?: string
) {
  if (locationId) {
    const location = await locationRepository.findActiveById(locationId);
    if (!location) {
      return failure("Location is not available");
    }
    if (!(await canFulfillAtLocation(location.id, items))) {
      return failure(`Insufficient stock at ${location.name}`);
    }
    return success(location);
  }

  const candidates: { id: string; name: string }[] = [];
  const defaultLocation = await locationRepository.findDefault();
  if (defaultLocation) {
    candidates.push(defaultLocation);
  }

  const activeLocations = await locationRepository.findAll();
  for (const location of activeLocations) {
    if (!candidates.some((candidate) => candidate.id === location.id)) {
      candidates.push(location);
    }
  }

  for (const location of candidates) {
    if (await canFulfillAtLocation(location.id, items)) {
      return success(location);
    }
  }

  return failure("Insufficient stock at this location");
}

type SupplyWithThreshold = {
  id: string;
  name: string;
  quantity: number;
  minimumThreshold: number;
};

async function notifyIfLowStock(supply: SupplyWithThreshold) {
  if (supply.quantity <= supply.minimumThreshold) {
    await notificationService.notifyAdminsLowStock(
      supply.name,
      supply.quantity,
      supply.id
    );
  }
}

function mergeBulkConsumeItems(items: BulkConsumeInput["items"]) {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.supplyId, (merged.get(item.supplyId) ?? 0) + item.quantity);
  }
  return [...merged.entries()].map(([supplyId, quantity]) => ({
    supplyId,
    quantity,
  }));
}

async function writeConsumeMovement(
  tx: TransactionClient,
  userId: string,
  supplyId: string,
  locationId: string,
  quantity: number,
  options?: { badgeId?: string; notes?: string | null }
) {
  await tx.stockLevel.update({
    where: {
      supplyId_locationId: {
        supplyId,
        locationId,
      },
    },
    data: { quantity: { decrement: quantity } },
  });

  await tx.stockMovement.create({
    data: {
      supplyId,
      locationId,
      quantity,
      type: StockMovementType.CONSUME,
      badgeId: options?.badgeId ?? null,
      userId,
      notes: options?.notes ?? null,
    },
  });

  return stockLevelRepository.syncSupplyTotals(supplyId, tx);
}

export const stockMovementService = {
  async consume(
    userId: string,
    input: z.infer<typeof consumeSchema>
  ) {
    try {
      const data = consumeSchema.parse(input);
      const normalizedBarcode = normalizeBarcode(data.barcode);
      if (!normalizedBarcode) return failure("Item not found");

      const supply = await prisma.supply.findFirst({
        where: { barcode: normalizedBarcode },
      });

      if (!supply) return failure("Item not found");

      const locationResult = await resolveCheckoutLocation(
        [{ supplyId: supply.id, quantity: data.quantity }],
        data.locationId
      );
      if (!locationResult.success) {
        return locationResult;
      }
      const location = locationResult.data;

      const result = await executeWithAudit(
        userId,
        `Kiosk consumed ${data.quantity} ${supply.name}`,
        async (tx) => {
          const updated = await writeConsumeMovement(
            tx,
            userId,
            supply.id,
            location.id,
            data.quantity,
            { badgeId: data.badgeId }
          );
          await notifyIfLowStock(updated);
          return updated;
        }
      );

      return success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to record consumption");
    }
  },

  async consumeBulk(userId: string, input: BulkConsumeInput) {
    try {
      const data = bulkConsumeSchema.parse(input);
      const mergedItems = mergeBulkConsumeItems(data.items);
      const supplies = await Promise.all(
        mergedItems.map((item) => supplyRepository.findById(item.supplyId))
      );

      for (let i = 0; i < mergedItems.length; i++) {
        if (!supplies[i]) {
          return failure("Supply not found");
        }
      }

      const locationResult = await resolveCheckoutLocation(
        mergedItems,
        data.locationId
      );
      if (!locationResult.success) {
        if (data.locationId) {
          const location = await locationRepository.findActiveById(data.locationId);
          for (let i = 0; i < mergedItems.length; i++) {
            const item = mergedItems[i];
            const supply = supplies[i]!;
            const level = await stockLevelRepository.findAtLocation(
              item.supplyId,
              data.locationId
            );
            const available = level?.quantity ?? 0;
            if (available < item.quantity) {
              return failure(
                `Insufficient stock for ${supply.name} at ${location?.name ?? "this location"} (${available} available)`
              );
            }
          }
        } else {
          for (let i = 0; i < mergedItems.length; i++) {
            const item = mergedItems[i];
            const supply = supplies[i]!;
            const activeLevels = await prisma.stockLevel.findMany({
              where: {
                supplyId: item.supplyId,
                location: { isActive: true },
              },
            });
            const maxAvailable = Math.max(
              0,
              ...activeLevels.map((level) => level.quantity)
            );
            if (maxAvailable < item.quantity) {
              return failure(
                `Insufficient stock for ${supply.name} at this location`
              );
            }
          }
        }
        return locationResult;
      }
      const location = locationResult.data;

      const auditActions = mergedItems.map((item) => {
        const supply = supplies.find((s) => s?.id === item.supplyId);
        return `Checked out ${item.quantity} ${supply?.name ?? "item"}`;
      });

      const notes = data.notes?.trim() || null;

      const updatedSupplies = await executeWithAudits(
        userId,
        auditActions,
        async (tx) => {
          const results: SupplyWithThreshold[] = [];

          for (const item of mergedItems) {
            const updated = await writeConsumeMovement(
              tx,
              userId,
              item.supplyId,
              location.id,
              item.quantity,
              { notes }
            );
            await notifyIfLowStock(updated);
            results.push(updated);
          }

          return results;
        }
      );

      return success({ items: updatedSupplies });
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to record checkout");
    }
  },

  async receive(userId: string, input: ReceiveStockInput) {
    try {
      const data = receiveStockSchema.parse(input);
      const supply = await supplyRepository.findById(data.supplyId);
      if (!supply) return failure("Supply not found");

      const location = await resolveLocation(data.locationId);
      if (!location) {
        return failure(
          data.locationId ? "Location is not available" : "No location configured"
        );
      }

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

      const parsedAttachments = fileService.parseUploads(
        data.attachments ?? []
      );
      if (!parsedAttachments.success) {
        return failure(parsedAttachments.error);
      }

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

          const movement = await tx.stockMovement.create({
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

          if (parsedAttachments.data.length > 0) {
            await fileService.insertParsed(
              userId,
              parsedAttachments.data,
              {
                supplyId: supply.id,
                stockMovementId: movement.id,
                vendorReorderId: data.vendorReorderId ?? null,
                category: "receipt",
              },
              tx
            );
          }

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
      if (!location) {
        return failure(
          data.locationId ? "Location is not available" : "No location configured"
        );
      }

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

          await notifyIfLowStock(updated);

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

      const attachments = await fileService.listMetadataForMovements(
        movements.map((m) => m.id)
      );
      const attachmentsByMovement = new Map<string, typeof attachments>();
      for (const attachment of attachments) {
        if (!attachment.stockMovementId) continue;
        const list = attachmentsByMovement.get(attachment.stockMovementId) ?? [];
        list.push(attachment);
        attachmentsByMovement.set(attachment.stockMovementId, list);
      }

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
            attachments: (attachmentsByMovement.get(m.id) ?? []).map((a) => ({
              id: a.id,
              filename: a.filename,
              mimeType: a.mimeType,
              size: a.size,
            })),
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

      const parsedAttachments = fileService.parseUploads(
        data.attachments ?? []
      );
      if (!parsedAttachments.success) {
        return failure(parsedAttachments.error);
      }

      const reorder = await executeWithAudit(
        userId,
        `Logged external order for ${data.quantity} ${supply.name}`,
        async (tx) => {
          const created = await tx.vendorReorder.create({
            data: {
              supplyId: data.supplyId,
              vendorId: data.vendorId ?? null,
              quantity: data.quantity,
              externalPoNumber: data.externalPoNumber?.trim() || null,
              notes: data.notes?.trim() || null,
              createdById: userId,
            },
          });

          if (parsedAttachments.data.length > 0) {
            await fileService.insertParsed(
              userId,
              parsedAttachments.data,
              {
                supplyId: data.supplyId,
                vendorReorderId: created.id,
                category: "order",
              },
              tx
            );
          }

          return created;
        }
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

      const attachments = await fileService.listMetadataForReorders(
        reorders.map((reorder) => reorder.id)
      );
      const attachmentsByReorder = new Map<string, typeof attachments>();
      for (const attachment of attachments) {
        if (!attachment.vendorReorderId) continue;
        const list =
          attachmentsByReorder.get(attachment.vendorReorderId) ?? [];
        list.push(attachment);
        attachmentsByReorder.set(attachment.vendorReorderId, list);
      }

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
            attachments: (attachmentsByReorder.get(reorder.id) ?? []).map(
              (a) => ({
                id: a.id,
                filename: a.filename,
                mimeType: a.mimeType,
                size: a.size,
              })
            ),
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

  async getCheckoutStockLevels(locationId: string, supplyIds: string[]) {
    try {
      const location = await locationRepository.findActiveById(locationId);
      if (!location) {
        return failure("Location is not available");
      }

      const uniqueSupplyIds = [...new Set(supplyIds)];
      const levels =
        uniqueSupplyIds.length > 0
          ? await prisma.stockLevel.findMany({
              where: {
                locationId,
                supplyId: { in: uniqueSupplyIds },
                location: { isActive: true },
              },
              select: { supplyId: true, quantity: true },
            })
          : [];

      const stock = Object.fromEntries(
        uniqueSupplyIds.map((supplyId) => {
          const level = levels.find((entry) => entry.supplyId === supplyId);
          return [supplyId, level?.quantity ?? 0];
        })
      );

      return success({
        location: { id: location.id, name: location.name },
        stock,
      });
    } catch {
      return failure("Failed to fetch stock levels");
    }
  },
};
