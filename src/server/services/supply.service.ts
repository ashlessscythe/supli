import { z } from "zod";
import { StockMovementType } from "@prisma/client";
import {
  supplyAdminSchema,
  supplyStaffUpdateSchema,
  type SupplyInput,
  type SupplyStaffUpdateInput,
} from "@/lib/validation/supply";
import { failure, success, type ActionResult } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { executeWithAudit, executeWithAudits } from "@/server/audit";
import { notificationService } from "@/server/services/notification.service";

// Prisma unique-constraint violation
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export const supplyService = {
  async list(): Promise<ActionResult<Awaited<ReturnType<typeof supplyRepository.findAll>>>> {
    try {
      const supplies = await supplyRepository.findAll();
      return success(supplies);
    } catch {
      return failure("Failed to fetch supplies");
    }
  },

  async getById(id: string) {
    try {
      const supply = await supplyRepository.findById(id);
      if (!supply) return failure("Supply not found");
      return success(supply);
    } catch {
      return failure("Failed to fetch supply");
    }
  },

  async getDetails(id: string) {
    try {
      const supply = await supplyRepository.findDetails(id);
      if (!supply) return failure("Supply not found");

      const userIds = [
        ...new Set(
          supply.stockMovements
            .map((m) => m.userId)
            .filter((uid): uid is string => !!uid)
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

      const lastReceiptMovement = supply.stockMovements.find(
        (m) => m.type === StockMovementType.RECEIVE
      );

      return success({
        id: supply.id,
        name: supply.name,
        description: supply.description,
        quantity: supply.quantity,
        minimumThreshold: supply.minimumThreshold,
        barcode: supply.barcode,
        internalSku: supply.internalSku,
        createdAt: supply.createdAt,
        updatedAt: supply.updatedAt,
        itemType: supply.itemType,
        stockLevels: supply.stockLevels.map((sl) => ({
          locationId: sl.locationId,
          locationName: sl.location.name,
          quantity: sl.quantity,
          minimumThreshold: sl.minimumThreshold,
        })),
        vendors: supply.itemVendors.map((iv) => ({
          id: iv.vendor.id,
          name: iv.vendor.name,
          contact: iv.vendor.contact,
          website: iv.vendor.website,
          vendorSku: iv.vendorSku,
          internalSku: iv.internalSku,
          isPreferred: iv.isPreferred,
          leadTimeDays: iv.leadTimeDays,
          moq: iv.moq,
          cost: iv.cost != null ? Number(iv.cost) : null,
        })),
        lastReceipt: lastReceiptMovement
          ? {
              id: lastReceiptMovement.id,
              createdAt: lastReceiptMovement.createdAt,
              quantity: lastReceiptMovement.quantity,
              locationName: lastReceiptMovement.location.name,
              notes: lastReceiptMovement.notes,
              externalPoNumber:
                lastReceiptMovement.vendorReorder?.externalPoNumber ?? null,
              username: lastReceiptMovement.userId
                ? userMap.get(lastReceiptMovement.userId) ?? "Unknown"
                : "System",
            }
          : null,
        recentMovements: supply.stockMovements.map((m) => ({
          id: m.id,
          type: m.type,
          quantity: m.quantity,
          createdAt: m.createdAt,
          locationName: m.location.name,
          notes: m.notes,
          externalPoNumber: m.vendorReorder?.externalPoNumber ?? null,
          username: m.userId ? userMap.get(m.userId) ?? "Unknown" : "System",
        })),
        recentRequests: supply.requests.map((r) => ({
          id: r.id,
          quantity: r.quantity,
          status: r.status,
          username: r.user.username,
          createdAt: r.createdAt,
        })),
        openReorders: supply.vendorReorders.map((vr) => ({
          id: vr.id,
          quantity: vr.quantity,
          status: vr.status,
          vendorName: vr.vendor?.name ?? null,
          orderedAt: vr.orderedAt,
          externalPoNumber: vr.externalPoNumber,
        })),
      });
    } catch {
      return failure("Failed to fetch supply details");
    }
  },

  async create(userId: string, input: SupplyInput) {
    try {
      const data = supplyAdminSchema.parse(input);
      const supply = await executeWithAudit(
        userId,
        `Created supply: ${data.name}`,
        (tx) => supplyRepository.create(data, tx)
      );
      return success(supply);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      if (isUniqueViolation(error)) {
        return failure("A supply with that barcode or SKU already exists");
      }
      return failure("Failed to create supply");
    }
  },

  async update(userId: string, id: string, input: SupplyInput) {
    try {
      const data = supplyAdminSchema.parse(input);
      const supply = await executeWithAudit(
        userId,
        `Updated supply: ${data.name}`,
        (tx) => supplyRepository.update(id, data, tx)
      );

      if (data.quantity <= data.minimumThreshold) {
        await notificationService.notifyAdminsLowStock(
          supply.name,
          supply.quantity,
          supply.id
        );
      }

      return success(supply);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      if (isUniqueViolation(error)) {
        return failure("A supply with that barcode or SKU already exists");
      }
      return failure("Failed to update supply");
    }
  },

  async updateByStaff(userId: string, id: string, input: SupplyStaffUpdateInput) {
    try {
      const data = supplyStaffUpdateSchema.parse(input);
      const existing = await supplyRepository.findById(id);
      if (!existing) return failure("Supply not found");

      const supply = await executeWithAudit(
        userId,
        `Updated supply: ${existing.name}`,
        (tx) => supplyRepository.update(id, data, tx)
      );
      return success(supply);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update supply");
    }
  },

  async delete(userId: string, id: string) {
    try {
      const pending = await supplyRepository.hasPendingRequests(id);
      if (pending) {
        return failure("Cannot delete supply with pending requests");
      }

      const hasStock = await supplyRepository.hasRemainingStock(id);
      if (hasStock) {
        return failure("Cannot delete supply with remaining quantity");
      }

      const openOrders = await supplyRepository.hasOpenOrders(id);
      if (openOrders) {
        return failure("Cannot delete supply with open orders");
      }

      const existing = await supplyRepository.findById(id);
      if (!existing) return failure("Supply not found");

      await executeWithAudit(
        userId,
        `Deleted supply: ${existing.name}`,
        (tx) => supplyRepository.delete(id, tx).then(() => existing)
      );

      return success(existing);
    } catch {
      return failure("Failed to delete supply");
    }
  },

  async updateQuantity(userId: string, id: string, quantity: number) {
    try {
      if (quantity < 0) return failure("Quantity cannot be negative");

      const supply = await supplyRepository.findById(id);
      if (!supply) return failure("Supply not found");

      const actions = [
        `Updated quantity for ${supply.name} to ${quantity}`,
      ];
      if (quantity <= supply.minimumThreshold) {
        actions.push(
          `Low stock alert for ${supply.name} (${quantity} remaining)`
        );
      }

      const updated = await executeWithAudits(userId, actions, (tx) =>
        supplyRepository.update(id, { quantity }, tx)
      );

      if (quantity <= supply.minimumThreshold) {
        await notificationService.notifyAdminsLowStock(
          supply.name,
          quantity,
          supply.id
        );
      }

      return success(updated);
    } catch {
      return failure("Failed to update quantity");
    }
  },
};
