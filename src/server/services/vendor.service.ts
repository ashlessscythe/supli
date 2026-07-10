import { z } from "zod";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { executeWithAudit } from "@/server/audit";
import type { TransactionClient } from "@/server/audit";

const vendorSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

const vendorUpdateSchema = vendorSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

const itemVendorLinkSchema = z.object({
  supplyId: z.string(),
  vendorSku: z.string().optional(),
  internalSku: z.string().optional(),
  isPreferred: z.boolean().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  moq: z.number().int().positive().optional(),
  cost: z.number().min(0).optional(),
});

const itemVendorUpdateSchema = z.object({
  supplyId: z.string(),
  vendorSku: z.string().nullable().optional(),
  internalSku: z.string().nullable().optional(),
  isPreferred: z.boolean().optional(),
  leadTimeDays: z.number().int().positive().nullable().optional(),
  moq: z.number().int().positive().nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
});

function mapItemVendorLink(item: {
  supplyId: string;
  vendorSku: string | null;
  internalSku: string | null;
  isPreferred: boolean;
  leadTimeDays: number | null;
  moq: number | null;
  cost: { toNumber?: () => number } | number | null;
}) {
  return {
    supplyId: item.supplyId,
    vendorSku: item.vendorSku,
    internalSku: item.internalSku,
    isPreferred: item.isPreferred,
    leadTimeDays: item.leadTimeDays,
    moq: item.moq,
    cost:
      item.cost != null
        ? typeof item.cost === "number"
          ? item.cost
          : Number(item.cost)
        : null,
  };
}

async function clearOtherPreferredVendors(
  tx: TransactionClient,
  supplyId: string,
  vendorId: string
) {
  await tx.itemVendor.updateMany({
    where: {
      supplyId,
      vendorId: { not: vendorId },
      isPreferred: true,
    },
    data: { isPreferred: false },
  });
}

export const vendorService = {
  async list() {
    try {
      const vendors = await prisma.vendor.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: { _count: { select: { itemVendors: true } } },
      });
      return success(vendors);
    } catch {
      return failure("Failed to fetch vendors");
    }
  },

  async listAll() {
    try {
      const vendors = await prisma.vendor.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { itemVendors: true } } },
      });
      return success(vendors);
    } catch {
      return failure("Failed to fetch vendors");
    }
  },

  async listItems(vendorId: string) {
    try {
      const items = await prisma.itemVendor.findMany({
        where: { vendorId },
        include: { supply: { select: { id: true, name: true, quantity: true, minimumThreshold: true } } },
        orderBy: { supply: { name: "asc" } },
      });
      return success(
        items.map((item) => ({
          supplyId: item.supply.id,
          name: item.supply.name,
          quantity: item.supply.quantity,
          minimumThreshold: item.supply.minimumThreshold,
          vendorSku: item.vendorSku,
          internalSku: item.internalSku,
          isPreferred: item.isPreferred,
          leadTimeDays: item.leadTimeDays,
          moq: item.moq,
          cost: item.cost ? Number(item.cost) : null,
        }))
      );
    } catch {
      return failure("Failed to fetch vendor items");
    }
  },

  async create(userId: string, input: z.infer<typeof vendorSchema>) {
    try {
      const data = vendorSchema.parse(input);
      const vendor = await executeWithAudit(
        userId,
        `Created vendor: ${data.name}`,
        (tx) =>
          tx.vendor.create({
            data: {
              name: data.name,
              contact: data.contact,
              website: data.website || null,
              notes: data.notes,
            },
          })
      );
      return success(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create vendor");
    }
  },

  async update(userId: string, input: z.infer<typeof vendorUpdateSchema>) {
    try {
      const { id, ...fields } = vendorUpdateSchema.parse(input);
      const existing = await prisma.vendor.findUnique({ where: { id } });
      if (!existing) return failure("Vendor not found");

      const vendor = await executeWithAudit(
        userId,
        `Updated vendor: ${fields.name}`,
        (tx) =>
          tx.vendor.update({
            where: { id },
            data: {
              name: fields.name,
              contact: fields.contact?.trim() || null,
              website: fields.website?.trim() || null,
              notes: fields.notes?.trim() || null,
              ...(fields.isActive !== undefined
                ? { isActive: fields.isActive }
                : {}),
            },
          })
      );
      return success(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update vendor");
    }
  },

  async linkItem(
    vendorId: string,
    userId: string,
    input: z.infer<typeof itemVendorLinkSchema>
  ) {
    try {
      const data = itemVendorLinkSchema.parse(input);

      const [supply, vendor, existing] = await Promise.all([
        prisma.supply.findUnique({ where: { id: data.supplyId } }),
        prisma.vendor.findUnique({ where: { id: vendorId } }),
        prisma.itemVendor.findUnique({
          where: {
            supplyId_vendorId: { supplyId: data.supplyId, vendorId },
          },
        }),
      ]);

      if (!supply) return failure("Supply not found");
      if (!vendor) return failure("Vendor not found");
      if (existing) return failure("This supply is already linked to this vendor");

      const link = await executeWithAudit(
        userId,
        `Linked ${vendor.name} to supply: ${supply.name}`,
        async (tx) => {
          if (data.isPreferred) {
            await clearOtherPreferredVendors(tx, data.supplyId, vendorId);
          }

          return tx.itemVendor.create({
            data: {
              supplyId: data.supplyId,
              vendorId,
              vendorSku: data.vendorSku?.trim() || null,
              internalSku: data.internalSku?.trim() || null,
              isPreferred: data.isPreferred ?? false,
              leadTimeDays: data.leadTimeDays ?? null,
              moq: data.moq ?? null,
              cost: data.cost ?? null,
            },
          });
        }
      );

      return success(mapItemVendorLink(link));
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to link vendor");
    }
  },

  async updateItemLink(
    vendorId: string,
    userId: string,
    input: z.infer<typeof itemVendorUpdateSchema>
  ) {
    try {
      const data = itemVendorUpdateSchema.parse(input);
      const existing = await prisma.itemVendor.findUnique({
        where: {
          supplyId_vendorId: { supplyId: data.supplyId, vendorId },
        },
        include: {
          supply: { select: { name: true } },
          vendor: { select: { name: true } },
        },
      });
      if (!existing) return failure("Item link not found");

      const link = await executeWithAudit(
        userId,
        `Updated vendor link for ${existing.supply.name} (${existing.vendor.name})`,
        async (tx) => {
          if (data.isPreferred === true) {
            await clearOtherPreferredVendors(tx, data.supplyId, vendorId);
          }

          return tx.itemVendor.update({
            where: {
              supplyId_vendorId: { supplyId: data.supplyId, vendorId },
            },
            data: {
              ...(data.vendorSku !== undefined
                ? { vendorSku: data.vendorSku?.trim() || null }
                : {}),
              ...(data.internalSku !== undefined
                ? { internalSku: data.internalSku?.trim() || null }
                : {}),
              ...(data.isPreferred !== undefined
                ? { isPreferred: data.isPreferred }
                : {}),
              ...(data.leadTimeDays !== undefined
                ? { leadTimeDays: data.leadTimeDays }
                : {}),
              ...(data.moq !== undefined ? { moq: data.moq } : {}),
              ...(data.cost !== undefined ? { cost: data.cost } : {}),
            },
          });
        }
      );

      return success(mapItemVendorLink(link));
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update item link");
    }
  },

  async unlinkItem(vendorId: string, supplyId: string, userId: string) {
    try {
      const existing = await prisma.itemVendor.findUnique({
        where: {
          supplyId_vendorId: { supplyId, vendorId },
        },
        include: {
          supply: { select: { name: true } },
          vendor: { select: { name: true } },
        },
      });
      if (!existing) return failure("Item link not found");

      await executeWithAudit(
        userId,
        `Unlinked ${existing.vendor.name} from supply: ${existing.supply.name}`,
        (tx) =>
          tx.itemVendor.delete({
            where: {
              supplyId_vendorId: { supplyId, vendorId },
            },
          })
      );

      return success({ supplyId });
    } catch {
      return failure("Failed to unlink vendor");
    }
  },
};
