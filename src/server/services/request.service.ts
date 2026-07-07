import { z } from "zod";
import { RequestStatus } from "@prisma/client";
import { requestSchema, type RequestInput } from "@/lib/validation/request";
import { failure, success } from "@/lib/result";
import { requestRepository } from "@/server/repositories/request.repository";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { settingsService } from "@/server/services/settings.service";
import { executeWithAudit } from "@/server/audit";

export const requestService = {
  async list(userId: string, role: string) {
    try {
      const showAll = await settingsService.shouldShowAllRequests();
      const where =
        role !== "ADMIN" && !showAll ? { userId } : {};

      const requests = await requestRepository.findMany(where);
      return success(requests);
    } catch {
      return failure("Failed to fetch requests");
    }
  },

  async getById(userId: string, role: string, id: string) {
    try {
      const showAll = await settingsService.shouldShowAllRequests();
      const where = {
        id,
        ...(role !== "ADMIN" && !showAll ? { userId } : {}),
      };

      const request = await requestRepository.findFirst(where);
      if (!request) return failure("Request not found");
      return success(request);
    } catch {
      return failure("Failed to fetch request");
    }
  },

  async create(actorId: string, input: RequestInput) {
    try {
      const data = requestSchema.parse(input);
      const supply = await supplyRepository.findById(data.supplyId);

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
              userId: actorId,
              supplyId: data.supplyId,
              quantity: data.quantity,
            },
            tx
          )
      );

      return success(request);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create request");
    }
  },

  async updateStatus(actorId: string, id: string, status: RequestStatus) {
    try {
      if (![RequestStatus.APPROVED, RequestStatus.DENIED].includes(status as "APPROVED" | "DENIED")) {
        return failure("Invalid status");
      }

      const existing = await requestRepository.findById(id);
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

      const request = await executeWithAudit(
        actorId,
        `${status} request for ${existing.quantity} ${existing.supply.name}`,
        async (tx) => {
          if (status === RequestStatus.APPROVED) {
            await supplyRepository.decrementQuantity(
              existing.supplyId,
              existing.quantity,
              tx
            );
          }
          return requestRepository.updateStatus(id, status, tx);
        }
      );

      return success(request);
    } catch {
      return failure("Failed to update request");
    }
  },
};
