import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/server/services/auth.service", () => ({
  rateLimitService: {
    isLocked: vi.fn(),
    recordFailure: vi.fn(),
    reset: vi.fn(),
  },
  tokenService: {},
}));

describe("authOptions jwt callback", () => {
  const jwt = authOptions.callbacks?.jwt;
  if (!jwt) throw new Error("jwt callback missing");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears identity when the user no longer exists (deleted mid-session)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const token = await jwt({
      token: { sub: "user-1", username: "gone", role: Role.STAFF },
      user: undefined as never,
      account: null,
      profile: undefined,
      trigger: "update",
      session: undefined,
      isNewUser: false,
    } as never);

    expect(token.sub).toBeUndefined();
    expect(token.username).toBeUndefined();
    expect(token.role).toBeUndefined();
  });

  it("clears identity when the user is demoted to PENDING", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      username: "pending-user",
      role: Role.PENDING,
    } as never);

    const token = await jwt({
      token: { sub: "user-1", username: "pending-user", role: Role.STAFF },
      user: undefined as never,
      account: null,
      profile: undefined,
      trigger: "update",
      session: undefined,
      isNewUser: false,
    } as never);

    expect(token.sub).toBeUndefined();
    expect(token.role).toBeUndefined();
  });

  it("refreshes username and role from the database", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      username: "promoted",
      role: Role.ADMIN,
      siteId: "site-1",
    } as never);

    const token = await jwt({
      token: { sub: "user-1", username: "old", role: Role.STAFF },
      user: undefined as never,
      account: null,
      profile: undefined,
      trigger: "update",
      session: undefined,
      isNewUser: false,
    } as never);

    expect(token.username).toBe("promoted");
    expect(token.role).toBe(Role.ADMIN);
  });
});

describe("authOptions session callback", () => {
  const sessionCb = authOptions.callbacks?.session;
  if (!sessionCb) throw new Error("session callback missing");

  it("returns empty user fields when token identity was cleared", async () => {
    const session = await sessionCb({
      session: {
        user: { name: null, email: null, image: null },
        expires: "2099-01-01",
      },
      token: {},
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    } as never);

    expect(session.user).toEqual(
      expect.objectContaining({
        id: "",
        username: "",
        role: Role.STAFF,
      })
    );
  });

  it("hydrates session user from a valid token", async () => {
    const session = await sessionCb({
      session: {
        user: { name: null, email: null, image: null },
        expires: "2099-01-01",
      },
      token: { sub: "user-1", username: "walter", role: Role.ADMIN, siteId: "site-1" },
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    } as never);

    expect(session.user).toEqual(
      expect.objectContaining({
        id: "user-1",
        username: "walter",
        role: Role.ADMIN,
        siteId: "site-1",
      })
    );
  });
});
