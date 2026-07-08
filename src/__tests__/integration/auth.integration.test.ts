import { describe, it, expect } from "vitest";
import { TokenType } from "@prisma/client";
import bcrypt from "bcrypt";
import { isIntegrationEnabled, createStaffUser, getPrisma } from "./db";

describe.skipIf(!isIntegrationEnabled())("auth service (database)", () => {
  it("locks an identifier after repeated failed attempts", async () => {
    const { rateLimitService } = await import("@/server/services/auth.service");
    const identifier = "locked-user";

    for (let i = 0; i < 5; i++) {
      await rateLimitService.recordFailure(identifier);
    }

    expect(await rateLimitService.isLocked(identifier)).toBe(true);

    const prisma = await getPrisma();
    const record = await prisma.authAttempt.findUnique({
      where: { identifier },
    });
    expect(record?.lockedUntil).toBeInstanceOf(Date);
    expect(record!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("clears lockout after a successful reset", async () => {
    const { rateLimitService } = await import("@/server/services/auth.service");
    const identifier = "reset-user";

    for (let i = 0; i < 5; i++) {
      await rateLimitService.recordFailure(identifier);
    }
    expect(await rateLimitService.isLocked(identifier)).toBe(true);

    await rateLimitService.reset(identifier);

    expect(await rateLimitService.isLocked(identifier)).toBe(false);
    const prisma = await getPrisma();
    expect(
      await prisma.authAttempt.findUnique({ where: { identifier } })
    ).toBeNull();
  });

  it("creates, validates, and consumes password reset tokens", async () => {
    const { tokenService } = await import("@/server/services/auth.service");
    const staff = await createStaffUser({
      username: "tokenuser",
      email: "token@example.com",
    });

    const token = await tokenService.create(
      TokenType.PASSWORD_RESET,
      staff.email!,
      staff.id
    );

    const prisma = await getPrisma();
    const stored = await prisma.authToken.findUnique({ where: { token } });
    expect(stored?.type).toBe(TokenType.PASSWORD_RESET);
    expect(stored?.userId).toBe(staff.id);

    const validated = await tokenService.validate(
      token,
      TokenType.PASSWORD_RESET
    );
    expect(validated?.email).toBe(staff.email);

    await tokenService.consume(token);
    expect(await prisma.authToken.findUnique({ where: { token } })).toBeNull();
  });
});

describe.skipIf(!isIntegrationEnabled())("credentials login (database)", () => {
  async function getAuthorize() {
    const { authOptions } = await import("@/lib/auth");
    const provider = authOptions.providers[0];
    const authorize =
      provider &&
      "options" in provider &&
      provider.options &&
      "authorize" in provider.options
        ? provider.options.authorize
        : null;
    if (!authorize) throw new Error("authorize handler not found");
    return authorize;
  }

  it("authenticates a staff user with a real password hash", async () => {
    await createStaffUser({
      username: "realstaff",
      password: "StaffPass1",
    });

    const authorize = await getAuthorize();
    const result = await authorize({
      username: "realstaff",
      password: "StaffPass1",
    });

    expect(result).toMatchObject({
      username: "realstaff",
      role: "STAFF",
    });
    expect(result?.id).toBeDefined();
  });

  it("rejects pending users even with a valid password", async () => {
    const prisma = await getPrisma();
    const password = await bcrypt.hash("PendingPass1", 10);
    await prisma.user.create({
      data: {
        username: "pendinguser",
        email: "pending@example.com",
        password,
        role: "PENDING",
      },
    });

    const authorize = await getAuthorize();
    const result = await authorize({
      username: "pendinguser",
      password: "PendingPass1",
    });

    expect(result).toBeNull();
  });
});
