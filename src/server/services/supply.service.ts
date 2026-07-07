import { z } from "zod";
import { supplySchema, type SupplyInput } from "@/lib/validation/supply";
import { failure, success, type ActionResult } from "@/lib/result";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { executeWithAudit, executeWithAudits } from "@/server/audit";

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

  async create(userId: string, input: SupplyInput) {
    try {
      const data = supplySchema.parse(input);
      const supply = await executeWithAudit(
        userId,
        `Created supply: ${data.name}`,
        (tx) => supplyRepository.create(data, tx)
      );
      return success(supply);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create supply");
    }
  },

  async update(userId: string, id: string, input: SupplyInput) {
    try {
      const data = supplySchema.parse(input);
      const supply = await executeWithAudit(
        userId,
        `Updated supply: ${data.name}`,
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

      return success(updated);
    } catch {
      return failure("Failed to update quantity");
    }
  },
};
