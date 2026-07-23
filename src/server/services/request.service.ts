import { z } from "zod";
import { RequestStatus, StockMovementType } from "@prisma/client";
import { requestSchema, type RequestInput } from "@/lib/validation/request";
import { failure, success } from "@/lib/result";
import { requestRepository } from "@/server/repositories/request.repository";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { locationRepository } from "@/server/repositories/location.repository";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { settingsService } from "@/server/services/settings.service";
import { executeWithAudit } from "@/server/audit";
import { notificationService } from "@/server/services/notification.service";

export const requestService = {
  async list(userId: string, siteId: string, role: string) {
    try {
      const showAll = await settingsService.shouldShowAllRequests(siteId);
      const where = {
        siteId,
        ...(role !== "ADMIN" && !showAll ? { userId } : {}),
      };

      const requests = await requestRepository.findMany(where);
      return success(requests);
    } catch {
      return failure("Failed to fetch requests");
    }
  },

  async getById(userId: string, siteId: string, role: string, id: string) {
    try {
      const showAll = await settingsService.shouldShowAllRequests(siteId);
      const where = {
        id,
        siteId,
        ...(role !== "ADMIN" && !showAll ? { userId } : {}),
      };

      const request = await requestRepository.findFirst(where);
      if (!request) return failure("Request not found");
      return success(request);
    } catch {
      return failure("Failed to fetch request");
    }
  },

  async create(actorId: string, siteId: string, input: RequestInput) {
    try {
      const data = requestSchema.parse(input);
      const supply = await supplyRepository.findById(data.supplyId, siteId);

      if (!supply) return failure("Supply not found");
      if (data.quantity > supply.quantity) {
        return failure("Requested quantity exceeds available stock");
      }

      const request = await executeWithAudit(
        actorId,
        `Created request for ${data.quantity} ${supply.name}`,
        (tx) =>
          requestRepository.create(
            {
              siteId,
              userId: actorId,
              supplyId: data.supplyId,
              quantity: data.quantity,
            },
            tx
          ),
        siteId
      );

      return success(request);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create request");
    }
  },

  async updateStatus(
    actorId: string,
    siteId: string,
    id: string,
    status: RequestStatus
  ) {
    try {
      if (![RequestStatus.APPROVED, RequestStatus.DENIED].includes(status as "APPROVED" | "DENIED")) {
        return failure("Invalid status");
      }

      const existing = await requestRepository.findById(id, siteId);
      if (!existing) return failure("Request not found");
      if (existing.status !== RequestStatus.PENDING) {
        return failure("Request has already been processed");
      }

      if (
        status === RequestStatus.APPROVED &&
        existing.quantity > existing.supply.quantity
      ) {
        return failure("Insufficient supply quantity");
      }

      const syncedSupply = await executeWithAudit(
        actorId,
        `${status} request for ${existing.quantity} ${existing.supply.name}`,
        async (tx) => {
          let updatedSupply: {
            id: string;
            name: string;
            quantity: number;
            minimumThreshold: number;
          } | null = null;

          if (status === RequestStatus.APPROVED) {
            const location = await locationRepository.findDefault(siteId);
            if (!location) {
              throw new Error("No location configured");
            }

            let level = await tx.stockLevel.findUnique({
              where: {
                supplyId_locationId: {
                  supplyId: existing.supplyId,
                  locationId: location.id,
                },
              },
            });

            if (!level && existing.supply.quantity >= existing.quantity) {
              level = await tx.stockLevel.create({
                data: {
                  supplyId: existing.supplyId,
                  locationId: location.id,
                  quantity: existing.supply.quantity,
                  minimumThreshold: existing.supply.minimumThreshold,
                },
              });
            }

            if (!level || level.quantity < existing.quantity) {
              throw new Error("Insufficient stock at default location");
            }

            await tx.stockLevel.update({
              where: {
                supplyId_locationId: {
                  supplyId: existing.supplyId,
                  locationId: location.id,
                },
              },
              data: { quantity: { decrement: existing.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                supplyId: existing.supplyId,
                locationId: location.id,
                quantity: existing.quantity,
                type: StockMovementType.CONSUME,
                userId: actorId,
                notes: `Request approved for user ${existing.userId}`,
              },
            });

            updatedSupply = await stockLevelRepository.syncSupplyTotals(
              existing.supplyId,
              tx
            );
          }

          const result = await requestRepository.updateStatus(
            id,
            siteId,
            status,
            tx
          );
          if (result.count === 0) {
            throw new Error("Request not found");
          }

          return updatedSupply;
        },
        siteId
      );

      const request = await requestRepository.findById(id, siteId);
      if (!request) return failure("Request not found");

      await notificationService.notifyRequestStatus(
        existing.userId,
        existing.supply.name,
        status as "APPROVED" | "DENIED",
        id
      );

      if (status === RequestStatus.APPROVED && syncedSupply) {
        if (syncedSupply.quantity <= syncedSupply.minimumThreshold) {
          await notificationService.notifyAdminsLowStock(
            siteId,
            syncedSupply.name,
            syncedSupply.quantity,
            syncedSupply.id
          );
        }
      }

      return success(request);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "No location configured") {
          return failure("No location configured");
        }
        if (error.message === "Insufficient stock at default location") {
          return failure("Insufficient stock at default location");
        }
      }
      return failure("Failed to update request");
    }
  },
};
