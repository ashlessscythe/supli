import { z } from "zod";
import {
  supplyAdminSchema,
  supplyStaffUpdateSchema,
  type SupplyInput,
  type SupplyStaffUpdateInput,
} from "@/lib/validation/supply";
import { failure, success, type ActionResult } from "@/lib/result";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { executeWithAudit, executeWithAudits } from "@/server/audit";

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
