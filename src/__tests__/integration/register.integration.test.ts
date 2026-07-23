import { describe, it, expect, beforeEach } from "vitest";
import { Role, TokenType } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  isIntegrationEnabled,
  createAdminUser,
  createStaffUser,
  createTestSite,
  getPrisma,
  resetDatabase,
} from "./db";

describe.skipIf(!isIntegrationEnabled())("user registration (database)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates a pending user in the database", async () => {
    const admin = await createAdminUser();
    const registerPayload = {
      username: "newuser",
      email: "newuser@example.com",
      password: "Password1",
      siteId: admin.siteId!,
    };

    const { userService } = await import("@/server/services/user.service");
    const result = await userService.register(registerPayload);

    expect(result.success).toBe(true);

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { username: "newuser" },
    });

    expect(user).not.toBeNull();
    expect(user?.role).toBe(Role.PENDING);
    expect(user?.email).toBe("newuser@example.com");
    expect(user?.siteId).toBe(admin.siteId);
    expect(await bcrypt.compare("Password1", user!.password)).toBe(true);

    const notifications = await prisma.notification.findMany({
      where: { type: "USER_REGISTRATION" },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.metadata).toMatchObject({
      userId: user?.id,
      username: "newuser",
    });
  });

  it("rejects duplicate usernames using the real database", async () => {
    const site = await createTestSite();
    await createStaffUser({
      username: "taken",
      email: "taken@example.com",
      siteId: site.id,
    });

    const { userService } = await import("@/server/services/user.service");
    const result = await userService.register({
      username: "taken",
      email: "other@example.com",
      password: "Password1",
      siteId: site.id,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Username already exists");
    }

    const prisma = await getPrisma();
    expect(await prisma.user.count({ where: { username: "taken" } })).toBe(1);
  });

  it("approves a pending registration and promotes the user to staff", async () => {
    const admin = await createAdminUser();
    const { userService } = await import("@/server/services/user.service");

    await userService.register({
      username: "newuser",
      email: "newuser@example.com",
      password: "Password1",
      siteId: admin.siteId!,
    });
    const prisma = await getPrisma();
    const pending = await prisma.user.findUnique({
      where: { username: "newuser" },
    });

    const result = await userService.approveRegistration(
      admin.id,
      pending!.id,
      admin.siteId!
    );

    expect(result.success).toBe(true);

    const approved = await prisma.user.findUnique({
      where: { id: pending!.id },
    });
    expect(approved?.role).toBe(Role.STAFF);

    const audit = await prisma.auditLog.findFirst({
      where: { userId: admin.id, action: { contains: "Approved registration" } },
    });
    expect(audit).not.toBeNull();
  });
});

describe.skipIf(!isIntegrationEnabled())("password reset (database)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates a reset token and updates the password end to end", async () => {
    await createStaffUser({
      username: "resetme",
      email: "resetme@example.com",
      password: "OldPassw0rd",
    });

    const { userService } = await import("@/server/services/user.service");
    const forgot = await userService.forgotPassword({
      email: "resetme@example.com",
    });
    expect(forgot.success).toBe(true);

    const prisma = await getPrisma();
    const tokenRecord = await prisma.authToken.findFirst({
      where: {
        email: "resetme@example.com",
        type: TokenType.PASSWORD_RESET,
      },
    });
    expect(tokenRecord).not.toBeNull();

    const reset = await userService.resetPassword({
      token: tokenRecord!.token,
      password: "NewPassw0rd",
    });
    expect(reset.success).toBe(true);

    const user = await prisma.user.findUnique({
      where: { username: "resetme" },
    });
    expect(await bcrypt.compare("NewPassw0rd", user!.password)).toBe(true);
    expect(
      await prisma.authToken.findUnique({ where: { id: tokenRecord!.id } })
    ).toBeNull();
  });
});
