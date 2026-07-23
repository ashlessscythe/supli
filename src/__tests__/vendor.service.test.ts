import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { vendorService } from "@/server/services/vendor.service";

const SITE_ID = "site-1";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    vendor: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    supply: {
      findFirst: vi.fn(),
    },
    itemVendor: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("vendorService.update", () => {
  const userId = "admin-1";
  const existing = {
    id: "vendor-1",
    name: "Balam Industries",
    isActive: true,
  };

  const tx = {
    auditLog: { create: vi.fn() },
    vendor: {
      update: vi.fn().mockResolvedValue({ ...existing, isActive: false }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(prisma.vendor.findFirst).mockResolvedValue(existing as never);
  });

  it("deactivates a vendor when isActive is false", async () => {
    const result = await vendorService.update(userId, SITE_ID, {
      id: existing.id,
      name: existing.name,
      isActive: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
    expect(tx.vendor.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ isActive: false }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId,
        action: `Updated vendor: ${existing.name}`,
        siteId: SITE_ID,
      },
    });
  });
});

describe("vendorService.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only active vendors", async () => {
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([
      { id: "vendor-1", name: "Active Vendor", isActive: true },
    ] as never);

    const result = await vendorService.list(SITE_ID);

    expect(result.success).toBe(true);
    expect(prisma.vendor.findMany).toHaveBeenCalledWith({
      where: { siteId: SITE_ID, isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { itemVendors: true } } },
    });
  });
});

describe("vendorService.listAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active and inactive vendors", async () => {
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([
      { id: "vendor-1", name: "Active Vendor", isActive: true },
      { id: "vendor-2", name: "Inactive Vendor", isActive: false },
    ] as never);

    const result = await vendorService.listAll(SITE_ID);

    expect(result.success).toBe(true);
    expect(prisma.vendor.findMany).toHaveBeenCalledWith({
      where: { siteId: SITE_ID },
      orderBy: { name: "asc" },
      include: { _count: { select: { itemVendors: true } } },
    });
  });
});

describe("vendorService.listItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes leadTimeDays for the linked-items modal", async () => {
    vi.mocked(prisma.itemVendor.findMany).mockResolvedValue([
      {
        supplyId: "supply-1",
        vendorSku: "SKU-1",
        internalSku: null,
        isPreferred: true,
        leadTimeDays: 5,
        moq: 2,
        cost: 12.5,
        supply: {
          id: "supply-1",
          name: "Widget",
          quantity: 10,
          minimumThreshold: 2,
        },
      },
    ] as never);

    const result = await vendorService.listItems(SITE_ID, "vendor-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          supplyId: "supply-1",
          leadTimeDays: 5,
          moq: 2,
          cost: 12.5,
        })
      );
    }
  });
});

describe("vendorService.linkItem", () => {
  const userId = "admin-1";
  const vendorId = "vendor-1";
  const supplyId = "supply-1";

  const tx = {
    auditLog: { create: vi.fn() },
    itemVendor: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(prisma.supply.findFirst).mockResolvedValue({
      id: supplyId,
      name: "Widget",
    } as never);
    vi.mocked(prisma.vendor.findFirst).mockResolvedValue({
      id: vendorId,
      name: "Acme",
    } as never);
    vi.mocked(prisma.itemVendor.findUnique).mockResolvedValue(null);
    tx.itemVendor.create.mockResolvedValue({
      supplyId,
      vendorId,
      vendorSku: "SKU-1",
      internalSku: null,
      isPreferred: true,
      leadTimeDays: 5,
      moq: 10,
      cost: 12.5,
    });
  });

  it("creates a link and clears other preferred vendors", async () => {
    const result = await vendorService.linkItem(vendorId, userId, SITE_ID, {
      supplyId,
      vendorSku: "SKU-1",
      isPreferred: true,
      leadTimeDays: 5,
      moq: 10,
      cost: 12.5,
    });

    expect(result.success).toBe(true);
    expect(tx.itemVendor.updateMany).toHaveBeenCalledWith({
      where: {
        supplyId,
        vendorId: { not: vendorId },
        isPreferred: true,
      },
      data: { isPreferred: false },
    });
    expect(tx.itemVendor.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it("returns an error when supply is missing", async () => {
    vi.mocked(prisma.supply.findFirst).mockResolvedValue(null);

    const result = await vendorService.linkItem(vendorId, userId, SITE_ID, { supplyId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Supply not found");
    }
  });

  it("returns an error when vendor is missing", async () => {
    vi.mocked(prisma.vendor.findFirst).mockResolvedValue(null);

    const result = await vendorService.linkItem(vendorId, userId, SITE_ID, { supplyId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Vendor not found");
    }
  });

  it("returns an error when link already exists", async () => {
    vi.mocked(prisma.itemVendor.findUnique).mockResolvedValue({
      supplyId,
      vendorId,
    } as never);

    const result = await vendorService.linkItem(vendorId, userId, SITE_ID, { supplyId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("This supply is already linked to this vendor");
    }
  });
});

describe("vendorService.updateItemLink", () => {
  const userId = "admin-1";
  const vendorId = "vendor-1";
  const supplyId = "supply-1";

  const tx = {
    auditLog: { create: vi.fn() },
    itemVendor: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(prisma.itemVendor.findUnique).mockResolvedValue({
      supplyId,
      vendorId,
      supply: { name: "Widget", siteId: SITE_ID },
      vendor: { name: "Acme", siteId: SITE_ID },
    } as never);
    tx.itemVendor.update.mockResolvedValue({
      supplyId,
      vendorId,
      vendorSku: "NEW-SKU",
      internalSku: null,
      isPreferred: true,
      leadTimeDays: 3,
      moq: 5,
      cost: 9.99,
    });
  });

  it("updates link metadata and clears other preferred vendors", async () => {
    const result = await vendorService.updateItemLink(vendorId, userId, SITE_ID, {
      supplyId,
      vendorSku: "NEW-SKU",
      isPreferred: true,
      leadTimeDays: 3,
      moq: 5,
      cost: 9.99,
    });

    expect(result.success).toBe(true);
    expect(tx.itemVendor.updateMany).toHaveBeenCalledWith({
      where: {
        supplyId,
        vendorId: { not: vendorId },
        isPreferred: true,
      },
      data: { isPreferred: false },
    });
    expect(tx.itemVendor.update).toHaveBeenCalledWith({
      where: { supplyId_vendorId: { supplyId, vendorId } },
      data: expect.objectContaining({
        vendorSku: "NEW-SKU",
        isPreferred: true,
        leadTimeDays: 3,
        moq: 5,
        cost: 9.99,
      }),
    });
  });

  it("clears leadTimeDays when the inline editor sends null", async () => {
    tx.itemVendor.update.mockResolvedValue({
      supplyId,
      vendorId,
      vendorSku: null,
      internalSku: null,
      isPreferred: false,
      leadTimeDays: null,
      moq: null,
      cost: null,
    });

    const result = await vendorService.updateItemLink(vendorId, userId, SITE_ID, {
      supplyId,
      leadTimeDays: null,
    });

    expect(result.success).toBe(true);
    expect(tx.itemVendor.update).toHaveBeenCalledWith({
      where: { supplyId_vendorId: { supplyId, vendorId } },
      data: { leadTimeDays: null },
    });
    if (result.success) {
      expect(result.data.leadTimeDays).toBeNull();
    }
  });

  it("rejects non-positive leadTimeDays via zod", async () => {
    const result = await vendorService.updateItemLink(vendorId, userId, SITE_ID, {
      supplyId,
      leadTimeDays: 0,
    });

    expect(result.success).toBe(false);
    expect(tx.itemVendor.update).not.toHaveBeenCalled();
  });

  it("returns an error when link is missing", async () => {
    vi.mocked(prisma.itemVendor.findUnique).mockResolvedValue(null);

    const result = await vendorService.updateItemLink(vendorId, userId, SITE_ID, {
      supplyId,
      cost: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Item link not found");
    }
  });
});

describe("vendorService.unlinkItem", () => {
  const userId = "admin-1";
  const vendorId = "vendor-1";
  const supplyId = "supply-1";

  const tx = {
    auditLog: { create: vi.fn() },
    itemVendor: {
      delete: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(prisma.itemVendor.findUnique).mockResolvedValue({
      supplyId,
      vendorId,
      supply: { name: "Widget", siteId: SITE_ID },
      vendor: { name: "Acme", siteId: SITE_ID },
    } as never);
    tx.itemVendor.delete.mockResolvedValue({ supplyId, vendorId });
  });

  it("deletes an existing link", async () => {
    const result = await vendorService.unlinkItem(vendorId, supplyId, userId, SITE_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.supplyId).toBe(supplyId);
    }
    expect(tx.itemVendor.delete).toHaveBeenCalledWith({
      where: { supplyId_vendorId: { supplyId, vendorId } },
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it("returns an error when link is missing", async () => {
    vi.mocked(prisma.itemVendor.findUnique).mockResolvedValue(null);

    const result = await vendorService.unlinkItem(vendorId, supplyId, userId, SITE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Item link not found");
    }
  });
});
