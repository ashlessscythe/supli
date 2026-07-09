import { z } from "zod";
import { failure, success } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { executeWithAudit } from "@/server/audit";

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

const itemVendorSchema = z.object({
  supplyId: z.string(),
  vendorId: z.string(),
  vendorSku: z.string().optional(),
  internalSku: z.string().optional(),
  isPreferred: z.boolean().default(false),
  leadTimeDays: z.number().int().positive().optional(),
  moq: z.number().int().positive().optional(),
  cost: z.number().positive().optional(),
});

const itemVendorUpdateSchema = z.object({
  supplyId: z.string(),
  cost: z.number().min(0).nullable().optional(),
});

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
        include: { supply: { select: { id: true, name: true, quantity: true } } },
        orderBy: { supply: { name: "asc" } },
      });
      return success(
        items.map((item) => ({
          supplyId: item.supply.id,
          name: item.supply.name,
          quantity: item.supply.quantity,
          vendorSku: item.vendorSku,
          isPreferred: item.isPreferred,
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

  async linkItem(userId: string, input: z.infer<typeof itemVendorSchema>) {
    try {
      const data = itemVendorSchema.parse(input);
      const link = await executeWithAudit(
        userId,
        `Linked vendor to supply`,
        (tx) =>
          tx.itemVendor.create({
            data: {
              ...data,
              cost: data.cost ?? null,
            },
          })
      );
      return success(link);
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
        include: { supply: { select: { name: true } } },
      });
      if (!existing) return failure("Item link not found");

      const link = await executeWithAudit(
        userId,
        `Updated vendor catalog cost for ${existing.supply.name}`,
        (tx) =>
          tx.itemVendor.update({
            where: {
              supplyId_vendorId: { supplyId: data.supplyId, vendorId },
            },
            data: {
              ...(data.cost !== undefined ? { cost: data.cost } : {}),
            },
          })
      );
      return success({
        supplyId: link.supplyId,
        cost: link.cost != null ? Number(link.cost) : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update item link");
    }
  },
};
