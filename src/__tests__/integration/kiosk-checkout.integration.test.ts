import { describe, it, expect, beforeEach } from "vitest";
import { Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  isIntegrationEnabled,
  createTestSite,
  getPrisma,
  resetDatabase,
} from "./db";
import { stockMovementService } from "@/server/services/stock-movement.service";

describe.skipIf(!isIntegrationEnabled())(
  "kiosk checkout consumeBulk (database)",
  () => {
    beforeEach(async () => {
      await resetDatabase();
    });

    async function seedTwoSupplies() {
      const prisma = await getPrisma();
      const site = await createTestSite({ slug: "kiosk-site", name: "Kiosk" });
      const user = await prisma.user.create({
        data: {
          username: "kiosk-kiosk-site",
          password: await bcrypt.hash("unused", 10),
          role: Role.STAFF,
          siteId: site.id,
        },
      });
      const location = await prisma.location.create({
        data: {
          siteId: site.id,
          name: "Main closet",
          type: "storage",
          isActive: true,
        },
      });
      const supplyA = await prisma.supply.create({
        data: {
          siteId: site.id,
          name: "Gloves",
          description: "Nitrile",
          quantity: 10,
          minimumThreshold: 1,
          barcode: "GLOVES1",
        },
      });
      const supplyB = await prisma.supply.create({
        data: {
          siteId: site.id,
          name: "Masks",
          description: "Surgical",
          quantity: 8,
          minimumThreshold: 1,
          barcode: "MASKS1",
        },
      });
      await prisma.stockLevel.createMany({
        data: [
          {
            supplyId: supplyA.id,
            locationId: location.id,
            quantity: 10,
          },
          {
            supplyId: supplyB.id,
            locationId: location.id,
            quantity: 8,
          },
        ],
      });
      return { prisma, site, user, location, supplyA, supplyB };
    }

    it("checks out two items, decrements stock, writes CONSUME + audits", async () => {
      const { prisma, site, user, supplyA, supplyB } = await seedTwoSupplies();

      const result = await stockMovementService.consumeBulk(
        user.id,
        site.id,
        {
          items: [
            { supplyId: supplyA.id, quantity: 2 },
            { supplyId: supplyB.id, quantity: 3 },
          ],
        },
        { auditPrefix: "Kiosk consumed" }
      );

      expect(result.success).toBe(true);

      const levelA = await prisma.stockLevel.findFirst({
        where: { supplyId: supplyA.id },
      });
      const levelB = await prisma.stockLevel.findFirst({
        where: { supplyId: supplyB.id },
      });
      expect(levelA?.quantity).toBe(8);
      expect(levelB?.quantity).toBe(5);

      const totals = await prisma.supply.findMany({
        where: { id: { in: [supplyA.id, supplyB.id] } },
        orderBy: { name: "asc" },
      });
      expect(totals.find((s) => s.id === supplyA.id)?.quantity).toBe(8);
      expect(totals.find((s) => s.id === supplyB.id)?.quantity).toBe(5);

      const movements = await prisma.stockMovement.findMany({
        where: { type: StockMovementType.CONSUME },
        orderBy: { supplyId: "asc" },
      });
      expect(movements).toHaveLength(2);
      expect(movements.map((m) => m.quantity).sort()).toEqual([2, 3]);

      const audits = await prisma.auditLog.findMany({
        where: { userId: user.id },
      });
      expect(audits).toHaveLength(2);
      expect(audits.every((a) => a.action.startsWith("Kiosk consumed"))).toBe(
        true
      );
    });

    it("rolls back fully when one item is short", async () => {
      const { prisma, site, user, supplyA, supplyB } = await seedTwoSupplies();

      const result = await stockMovementService.consumeBulk(
        user.id,
        site.id,
        {
          items: [
            { supplyId: supplyA.id, quantity: 2 },
            { supplyId: supplyB.id, quantity: 99 },
          ],
        },
        { auditPrefix: "Kiosk consumed" }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.insufficient?.some((i) => i.supplyId === supplyB.id)).toBe(
          true
        );
      }

      const levelA = await prisma.stockLevel.findFirst({
        where: { supplyId: supplyA.id },
      });
      const levelB = await prisma.stockLevel.findFirst({
        where: { supplyId: supplyB.id },
      });
      expect(levelA?.quantity).toBe(10);
      expect(levelB?.quantity).toBe(8);

      expect(await prisma.stockMovement.count()).toBe(0);
      expect(await prisma.auditLog.count()).toBe(0);
    });
  }
);
