import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeKioskToken,
  isKioskAuthenticated,
  getKioskUserId,
} from "@/lib/kiosk";
import { settingsService } from "@/server/services/settings.service";
import { prisma } from "@/lib/prisma";
import { KIOSK_COOKIE } from "@/lib/kiosk-constants";
import { KIOSK_SITE_COOKIE } from "@/lib/sites";

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
    site: {
      findUnique: vi.fn(),
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
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
    expect(settingsService.getKioskPasswordHash).not.toHaveBeenCalled();
  });

  it("returns false when the site cookie is missing", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === KIOSK_COOKIE ? { value: "any-token" } : undefined,
    } as never);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
    expect(settingsService.getKioskPasswordHash).not.toHaveBeenCalled();
  });

  it("returns false when no password hash is configured", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => {
        if (name === KIOSK_COOKIE) return { value: "any-token" };
        if (name === KIOSK_SITE_COOKIE) return { value: "site-1" };
        return undefined;
      },
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(null);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
  });

  it("returns true for a token matching the current hash", async () => {
    const hash = "current-hash";
    const token = computeKioskToken(hash);
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => {
        if (name === KIOSK_COOKIE) return { value: token };
        if (name === KIOSK_SITE_COOKIE) return { value: "site-1" };
        return undefined;
      },
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(hash);

    await expect(isKioskAuthenticated()).resolves.toBe(true);
    expect(settingsService.getKioskPasswordHash).toHaveBeenCalledWith("site-1");
  });

  it("returns false after password change (old token vs new hash)", async () => {
    const oldToken = computeKioskToken("old-hash");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => {
        if (name === KIOSK_COOKIE) return { value: oldToken };
        if (name === KIOSK_SITE_COOKIE) return { value: "site-1" };
        return undefined;
      },
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(
      "new-hash"
    );

    await expect(isKioskAuthenticated()).resolves.toBe(false);
  });

  it("returns false for truncated tokens (length mismatch)", async () => {
    const hash = "current-hash";
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => {
        if (name === KIOSK_COOKIE)
          return { value: computeKioskToken(hash).slice(0, 10) };
        if (name === KIOSK_SITE_COOKIE) return { value: "site-1" };
        return undefined;
      },
    } as never);
    vi.mocked(settingsService.getKioskPasswordHash).mockResolvedValue(hash);

    await expect(isKioskAuthenticated()).resolves.toBe(false);
  });
});

describe("getKioskUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing kiosk user id for a site", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue({
      id: "site-1",
      slug: "main",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "kiosk-1",
    } as never);

    await expect(getKioskUserId("site-1")).resolves.toBe("kiosk-1");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "kiosk-main" },
      select: { id: true },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates the system kiosk user on first use", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue({
      id: "site-1",
      slug: "main",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "kiosk-new",
    } as never);

    await expect(getKioskUserId("site-1")).resolves.toBe("kiosk-new");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "kiosk-main",
          role: "STAFF",
          siteId: "site-1",
        }),
      })
    );
  });

  it("reads site id from the kiosk site cookie when omitted", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === KIOSK_SITE_COOKIE ? { value: "site-cookie" } : undefined,
    } as never);
    vi.mocked(prisma.site.findUnique).mockResolvedValue({
      id: "site-cookie",
      slug: "east",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "kiosk-east",
    } as never);

    await expect(getKioskUserId()).resolves.toBe("kiosk-east");
    expect(prisma.site.findUnique).toHaveBeenCalledWith({
      where: { id: "site-cookie" },
      select: { id: true, slug: true },
    });
  });
});
