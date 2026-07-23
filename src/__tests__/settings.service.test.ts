import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import {
  settingsService,
  DEFAULT_KIOSK_PASSWORD,
} from "@/server/services/settings.service";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { prisma } from "@/lib/prisma";

const SITE_ID = "site-1";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("new-hash"),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    site: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/repositories/settings.repository", () => ({
  settingsRepository: {
    findAll: vi.fn(),
    findByKey: vi.fn(),
    updateMany: vi.fn(),
  },
}));

describe("settingsService max request / defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults getMaxRequestQuantity to 100 when unset", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue(null as never);

    await expect(
      settingsService.getMaxRequestQuantity(SITE_ID)
    ).resolves.toBe(100);
    expect(settingsRepository.findByKey).toHaveBeenCalledWith(
      SITE_ID,
      "MAX_REQUEST_QUANTITY"
    );
  });

  it("parses MAX_REQUEST_QUANTITY when present", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue({
      value: "25",
    } as never);

    await expect(
      settingsService.getMaxRequestQuantity(SITE_ID)
    ).resolves.toBe(25);
  });
});

describe("settingsService kiosk password", () => {
  const tx = {
    auditLog: { create: vi.fn() },
    site: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("bootstraps the default kiosk password hash when missing", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.site.update).mockResolvedValue({} as never);

    const hash = await settingsService.ensureKioskPasswordHash(SITE_ID);

    expect(bcrypt.hash).toHaveBeenCalledWith(DEFAULT_KIOSK_PASSWORD, 10);
    expect(prisma.site.update).toHaveBeenCalledWith({
      where: { id: SITE_ID },
      data: { kioskPasswordHash: "new-hash" },
    });
    expect(hash).toBe("new-hash");
  });

  it("returns existing hash without re-updating", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue({
      kioskPasswordHash: "existing-hash",
    } as never);

    const hash = await settingsService.ensureKioskPasswordHash(SITE_ID);

    expect(hash).toBe("existing-hash");
    expect(prisma.site.update).not.toHaveBeenCalled();
  });

  it("rejects kiosk passwords shorter than 4 characters", async () => {
    const result = await settingsService.setKioskPassword(
      "admin",
      SITE_ID,
      "ab"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Kiosk password must be at least 4 characters");
    }
  });

  it("updates the kiosk password hash via audited site update", async () => {
    tx.site.update.mockResolvedValue({} as never);

    const result = await settingsService.setKioskPassword(
      "admin",
      SITE_ID,
      "newpin"
    );

    expect(result.success).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith("newpin", 10);
    expect(tx.site.update).toHaveBeenCalledWith({
      where: { id: SITE_ID },
      data: { kioskPasswordHash: "new-hash" },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "admin",
        action: "Updated kiosk password",
        siteId: SITE_ID,
      },
    });
  });

  it("verifyKioskPassword returns false for empty input", async () => {
    await expect(
      settingsService.verifyKioskPassword(SITE_ID, "")
    ).resolves.toBe(false);
    expect(prisma.site.findUnique).not.toHaveBeenCalled();
  });

  it("verifyKioskPassword compares against ensured hash", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue({
      kioskPasswordHash: "stored-hash",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      settingsService.verifyKioskPassword(SITE_ID, "kiosk1234")
    ).resolves.toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith("kiosk1234", "stored-hash");
  });
});
