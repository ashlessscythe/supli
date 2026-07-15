import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeKioskToken, isKioskAuthenticated, getKioskUserId } from "@/lib/kiosk";
import { settingsService } from "@/server/services/settings.service";
import { prisma } from "@/lib/prisma";
import { KIOSK_COOKIE, KIOSK_USERNAME } from "@/lib/kiosk-constants";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/server/services/settings.service", () => ({
  settingsService: {
    getKioskPasswordHash: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-random"),
  },
}));

import { cookies } from "next/headers";

describe("computeKioskToken", () => {
  it("is stable for a given password hash", () => {
    const a = computeKioskToken("hash-abc");
    const b = computeKioskToken("hash-abc");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when the password hash changes (invalidates sessions)", () => {
    const before = computeKioskToken("hash-old");
    const after = computeKioskToken("hash-new");
    expect(before).not.toBe(after);
  });
});

describe("isKioskAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the kiosk cookie is missing", async () => {
    vi.mocked(cookies).mockReturnValue({
      get: () => undefined,
    } as never);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
    expect(settingsService.getKioskPasswordHash).not.toHaveBeenCalled();
  });

  it("returns false when no password hash is configured", async () => {
    vi.mocked(cookies).mockReturnValue({
      get: () => ({ value: "any-token" }),
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(null);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
  });

  it("returns true for a token matching the current hash", async () => {
    const hash = "current-hash";
    const token = computeKioskToken(hash);
    vi.mocked(cookies).mockReturnValue({
      get: (name: string) =>
        name === KIOSK_COOKIE ? { value: token } : undefined,
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(hash);

    await expect(isKioskAuthenticated()).resolves.toBe(true);
  });

  it("returns false after password change (old token vs new hash)", async () => {
    const oldToken = computeKioskToken("old-hash");
    vi.mocked(cookies).mockReturnValue({
      get: () => ({ value: oldToken }),
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue("new-hash");

    await expect(isKioskAuthenticated()).resolves.toBe(false);
  });

  it("returns false for truncated tokens (length mismatch)", async () => {
    const hash = "current-hash";
    vi.mocked(cookies).mockReturnValue({
      get: () => ({ value: computeKioskToken(hash).slice(0, 10) }),
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(hash);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
  });
});

describe("getKioskUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing kiosk user id", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "kiosk-1" } as never);

    await expect(getKioskUserId()).resolves.toBe("kiosk-1");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates the system kiosk user on first use", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "kiosk-new" } as never);

    await expect(getKioskUserId()).resolves.toBe("kiosk-new");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: KIOSK_USERNAME,
          role: "STAFF",
        }),
      })
    );
  });
});
