import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { rateLimitService } from "@/server/services/auth.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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

function getAuthorize() {
  const provider = authOptions.providers[0] as unknown as {
    options?: {
      authorize?: (
        credentials: Partial<Record<string, unknown>> | undefined,
        request: Request
      ) => Promise<unknown>;
    };
  };
  const authorize = provider?.options?.authorize;
  if (!authorize) {
    throw new Error("Credentials authorize handler not found");
  }
  return authorize;
}

const dummyRequest = new Request("http://localhost/api/auth/callback/credentials");

describe("credentials login (NextAuth authorize)", () => {
  const authorize = getAuthorize();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimitService.isLocked).mockResolvedValue(false);
  });

  it("returns null when credentials are missing", async () => {
    const result = await authorize(undefined, dummyRequest);
    expect(result).toBeNull();
  });

  it("returns null when the account is rate limited", async () => {
    vi.mocked(rateLimitService.isLocked).mockResolvedValue(true);

    const result = await authorize({
      username: "lockeduser",
      password: "Password1",
    }, dummyRequest);

    expect(result).toBeNull();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("returns user data for valid credentials", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      username: "staffuser",
      password: "hashed-password",
      role: Role.STAFF,
      siteId: "site-1",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorize({
      username: "staffuser",
      password: "Password1",
    }, dummyRequest);

    expect(result).toEqual({
      id: "user-1",
      username: "staffuser",
      role: Role.STAFF,
      siteId: "site-1",
    });
    expect(rateLimitService.reset).toHaveBeenCalledWith("staffuser");
    expect(rateLimitService.recordFailure).not.toHaveBeenCalled();
  });

  it("normalizes username case before lookup", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      username: "walter",
      password: "hashed-password",
      role: Role.ADMIN,
      siteId: "site-1",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorize({
      username: "  Walter  ",
      password: "admin123",
    }, dummyRequest);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { username: { equals: "walter", mode: "insensitive" } },
    });
    expect(result).toMatchObject({ username: "walter" });
  });

  it("returns null and records failure for unknown users", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const result = await authorize({
      username: "unknown",
      password: "Password1",
    }, dummyRequest);

    expect(result).toBeNull();
    expect(rateLimitService.recordFailure).toHaveBeenCalledWith("unknown");
  });

  it("returns null and records failure for invalid passwords", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      username: "staffuser",
      password: "hashed-password",
      role: Role.STAFF,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authorize({
      username: "staffuser",
      password: "WrongPass1",
    }, dummyRequest);

    expect(result).toBeNull();
    expect(rateLimitService.recordFailure).toHaveBeenCalledWith("staffuser");
  });

  it("returns null for pending users without recording a failure", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      username: "pendinguser",
      password: "hashed-password",
      role: Role.PENDING,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorize({
      username: "pendinguser",
      password: "Password1",
    }, dummyRequest);

    expect(result).toBeNull();
    expect(rateLimitService.recordFailure).not.toHaveBeenCalled();
    expect(rateLimitService.reset).not.toHaveBeenCalled();
  });
});