import { z } from "zod";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { locationRepository } from "@/server/repositories/location.repository";
import { executeWithAudit } from "@/server/audit";

const locationSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
});

export const locationService = {
  async list() {
    try {
      return success(await locationRepository.findAll());
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
      return failure("Failed to create location");
    }
  },
};
