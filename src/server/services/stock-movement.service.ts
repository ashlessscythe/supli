import { z } from "zod";
import { StockMovementType } from "@prisma/client";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { locationRepository } from "@/server/repositories/location.repository";
import { executeWithAudit } from "@/server/audit";

const consumeSchema = z.object({
  barcode: z.string().min(1),
  quantity: z.number().int().positive(),
  locationId: z.string().optional(),
  badgeId: z.string().optional(),
});

export const stockMovementService = {
  async consume(
    userId: string,
    input: z.infer<typeof consumeSchema>
  ) {
    try {
      const data = consumeSchema.parse(input);
      const location =
        (data.locationId
          ? await locationRepository.findById(data.locationId)
          : null) ?? (await locationRepository.findDefault());

      if (!location) return failure("No location configured");

      const supply = await prisma.supply.findFirst({
        where: { barcode: data.barcode },
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
