import { z } from "zod";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { locationRepository } from "@/server/repositories/location.repository";
import { executeWithAudit } from "@/server/audit";

const locationSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
});

const locationUpdateSchema = locationSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export const locationService = {
  async list() {
    try {
      return success(await locationRepository.findAll());
    } catch {
      return failure("Failed to fetch locations");
    }
  },

  async listAll() {
    try {
      return success(await locationRepository.findAllAdmin());
    } catch {
      return failure("Failed to fetch locations");
    }
  },

  async listStockItems(locationId: string) {
    try {
      const stockLevels = await prisma.stockLevel.findMany({
        where: { locationId },
        include: { supply: { select: { id: true, name: true } } },
        orderBy: { supply: { name: "asc" } },
      });
      return success(
        stockLevels.map((level) => ({
          supplyId: level.supply.id,
          name: level.supply.name,
          quantity: level.quantity,
          minimumThreshold: level.minimumThreshold,
        }))
      );
    } catch {
      return failure("Failed to fetch location stock items");
    }
  },

  async create(userId: string, input: z.infer<typeof locationSchema>) {
    try {
      const data = locationSchema.parse(input);
      const location = await executeWithAudit(
        userId,
        `Created location: ${data.name}`,
        (tx) => tx.location.create({ data })
      );
      return success(location);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      if (isUniqueViolation(error)) {
        return failure("A location with that name already exists");
      }
      return failure("Failed to create location");
    }
  },

  async update(userId: string, input: z.infer<typeof locationUpdateSchema>) {
    try {
      const { id, ...fields } = locationUpdateSchema.parse(input);
      const existing = await locationRepository.findById(id);
      if (!existing) return failure("Location not found");

      const location = await executeWithAudit(
        userId,
        `Updated location: ${fields.name}`,
        (tx) =>
          tx.location.update({
            where: { id },
            data: {
              name: fields.name,
              type: fields.type,
              description: fields.description?.trim() || null,
              ...(fields.isActive !== undefined
                ? { isActive: fields.isActive }
                : {}),
            },
          })
      );

      if (fields.isActive === false && existing.isActive) {
        const affectedLevels = await prisma.stockLevel.findMany({
          where: { locationId: id },
          select: { supplyId: true },
        });
        await Promise.all(
          affectedLevels.map((level) =>
            stockLevelRepository.syncSupplyTotals(level.supplyId)
          )
        );
      }

      return success(location);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      if (isUniqueViolation(error)) {
        return failure("A location with that name already exists");
      }
      return failure("Failed to update location");
    }
  },
};
