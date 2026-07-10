import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { vendorService } from "@/server/services/vendor.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    vendor: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(existing as never);
  });

  it("deactivates a vendor when isActive is false", async () => {
    const result = await vendorService.update(userId, {
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

    const result = await vendorService.list();

    expect(result.success).toBe(true);
    expect(prisma.vendor.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
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

    const result = await vendorService.listAll();

    expect(result.success).toBe(true);
    expect(prisma.vendor.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      include: { _count: { select: { itemVendors: true } } },
    });
  });
});
