import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { isIntegrationEnabled, createAdminUser, getPrisma, resetDatabase } from "./db";

function createRegisterRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!isIntegrationEnabled())("POST /api/auth/register (database)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("persists a pending user through the HTTP route", async () => {
    const admin = await createAdminUser();

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      createRegisterRequest({
        username: "routeuser",
        email: "routeuser@example.com",
        password: "Password1",
        siteId: admin.siteId,
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("Account created");

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { username: "routeuser" },
    });

    expect(user?.role).toBe(Role.PENDING);
    expect(user?.email).toBe("routeuser@example.com");
    expect(user?.siteId).toBe(admin.siteId);
    expect(await bcrypt.compare("Password1", user!.password)).toBe(true);
  });

  it("returns 400 without creating a user when validation fails", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      createRegisterRequest({
        username: "",
        email: "not-an-email",
        password: "short",
      })
    );

    expect(response.status).toBe(400);

    const prisma = await getPrisma();
    expect(await prisma.user.count()).toBe(0);
  });
});
