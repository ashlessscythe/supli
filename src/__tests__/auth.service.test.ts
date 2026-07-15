import { describe, it, expect, vi, beforeEach } from "vitest";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitService, tokenService } from "@/server/services/auth.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authAttempt: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    authToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("rateLimitService", () => {
  const identifier = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no record exists", async () => {
    vi.mocked(prisma.authAttempt.findUnique).mockResolvedValue(null as never);

    const locked = await rateLimitService.isLocked(identifier);

    expect(locked).toBe(false);
  });

  it("returns true when lockedUntil is in the future", async () => {
    vi.mocked(prisma.authAttempt.findUnique).mockResolvedValue({
      identifier,
      lockedUntil: new Date(Date.now() + 60_000),
    } as never);

    const locked = await rateLimitService.isLocked(identifier);

    expect(locked).toBe(true);
  });

  it("returns false when lockedUntil is in the past", async () => {
    vi.mocked(prisma.authAttempt.findUnique).mockResolvedValue({
      identifier,
      lockedUntil: new Date(Date.now() - 60_000),
    } as never);

    const locked = await rateLimitService.isLocked(identifier);

    expect(locked).toBe(false);
  });

  it("increments attempts and locks after max attempts", async () => {
    vi.mocked(prisma.authAttempt.upsert).mockResolvedValue({
      identifier,
      attempts: 5,
    } as never);

    await rateLimitService.recordFailure(identifier);

    expect(prisma.authAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identifier },
      })
    );
    expect(prisma.authAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { identifier },
        data: expect.objectContaining({
          lockedUntil: expect.any(Date),
          attempts: 0,
        }),
      })
    );
  });

  it("resets attempts and deletes records", async () => {
    await rateLimitService.reset(identifier);

    expect(prisma.authAttempt.deleteMany).toHaveBeenCalledWith({
      where: { identifier },
    });
  });
});

describe("tokenService", () => {
  const email = "user@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a token and stores it with correct expiry for password reset", async () => {
    vi.mocked(prisma.authToken.create).mockResolvedValue({} as never);

    const token = await tokenService.create(
      TokenType.PASSWORD_RESET,
      email,
      "user-1"
    );

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({
      where: { email, type: TokenType.PASSWORD_RESET },
    });
    expect(prisma.authToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          token,
          type: TokenType.PASSWORD_RESET,
          email,
          userId: "user-1",
          expiresAt: expect.any(Date),
        }),
      })
    );
  });

  it("returns null and deletes expired token on validate", async () => {
    vi.mocked(prisma.authToken.findUnique).mockResolvedValue({
      id: "token-1",
      token: "expired",
      type: TokenType.PASSWORD_RESET,
      email,
      expiresAt: new Date(Date.now() - 1000),
    } as never);

    const result = await tokenService.validate("expired", TokenType.PASSWORD_RESET);

    expect(result).toBeNull();
    expect(prisma.authToken.delete).toHaveBeenCalledWith({
      where: { id: "token-1" },
    });
  });

  it("returns record when token is valid and type matches", async () => {
    const record = {
      id: "token-2",
      token: "valid",
      type: TokenType.PASSWORD_RESET,
      email,
      expiresAt: new Date(Date.now() + 1000),
    };
    vi.mocked(prisma.authToken.findUnique).mockResolvedValue(record as never);

    const result = await tokenService.validate("valid", TokenType.PASSWORD_RESET);

    expect(result).toEqual(record);
  });

  it("returns null when token type does not match", async () => {
    vi.mocked(prisma.authToken.findUnique).mockResolvedValue({
      id: "token-3",
      token: "wrong-type",
      type: TokenType.EMAIL_VERIFICATION,
      email,
      expiresAt: new Date(Date.now() + 1000),
    } as never);

    const result = await tokenService.validate(
      "wrong-type",
      TokenType.PASSWORD_RESET
    );

    expect(result).toBeNull();
  });

  it("consumes token by deleting all with same value", async () => {
    await tokenService.consume("to-consume");

    expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({
      where: { token: "to-consume" },
    });
  });
});

