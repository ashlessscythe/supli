import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import {
  settingsService,
  DEFAULT_KIOSK_PASSWORD,
  KIOSK_PASSWORD_KEY,
} from "@/server/services/settings.service";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { prisma } from "@/lib/prisma";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("new-hash"),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/repositories/settings.repository", () => ({
  settingsRepository: {
    findAll: vi.fn(),
    findByKey: vi.fn(),
    updateMany: vi.fn(),
    upsertByKey: vi.fn(),
  },
}));

describe("settingsService max request / defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults getMaxRequestQuantity to 100 when unset", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue(null as never);

    await expect(settingsService.getMaxRequestQuantity()).resolves.toBe(100);
  });

  it("parses MAX_REQUEST_QUANTITY when present", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue({
      value: "25",
    } as never);

    await expect(settingsService.getMaxRequestQuantity()).resolves.toBe(25);
  });
});

describe("settingsService kiosk password", () => {
  const tx = { auditLog: { create: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("bootstraps the default kiosk password hash when missing", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue(null as never);
    vi.mocked(settingsRepository.upsertByKey).mockResolvedValue({} as never);

    const hash = await settingsService.ensureKioskPasswordHash();

    expect(bcrypt.hash).toHaveBeenCalledWith(DEFAULT_KIOSK_PASSWORD, 10);
    expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
      KIOSK_PASSWORD_KEY,
      "new-hash",
      expect.any(String)
    );
    expect(hash).toBe("new-hash");
  });

  it("returns existing hash without re-upserting", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue({
      value: "existing-hash",
    } as never);

    const hash = await settingsService.ensureKioskPasswordHash();

    expect(hash).toBe("existing-hash");
    expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
  });

  it("rejects kiosk passwords shorter than 4 characters", async () => {
    const result = await settingsService.setKioskPassword("admin", "ab");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Kiosk password must be at least 4 characters");
    }
  });

  it("updates the kiosk password hash via audited upsert", async () => {
    vi.mocked(settingsRepository.upsertByKey).mockResolvedValue({} as never);

    const result = await settingsService.setKioskPassword("admin", "newpin");

    expect(result.success).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith("newpin", 10);
    expect(settingsRepository.upsertByKey).toHaveBeenCalled();
  });

  it("verifyKioskPassword returns false for empty input", async () => {
    await expect(settingsService.verifyKioskPassword("")).resolves.toBe(false);
    expect(settingsRepository.findByKey).not.toHaveBeenCalled();
  });

  it("verifyKioskPassword compares against ensured hash", async () => {
    vi.mocked(settingsRepository.findByKey).mockResolvedValue({
      value: "stored-hash",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(settingsService.verifyKioskPassword("kiosk1234")).resolves.toBe(
      true
    );
    expect(bcrypt.compare).toHaveBeenCalledWith("kiosk1234", "stored-hash");
  });
});
