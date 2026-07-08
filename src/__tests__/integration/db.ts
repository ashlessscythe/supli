import bcrypt from "bcrypt";
import { Role } from "@prisma/client";

export function isIntegrationEnabled() {
  return (
    Boolean(process.env.DATABASE_TEST_URL) && !process.env.SKIP_INTEGRATION
  );
}

export async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export async function resetDatabase() {
  const prisma = await getPrisma();

  // Postgres integration tests: TRUNCATE is the most reliable way to reset
  // between tests because it avoids FK RESTRICT ordering issues.
  const schema =
    (() => {
      try {
        const url = new URL(process.env.DATABASE_URL ?? "");
        const value = url.searchParams.get("schema") ?? "public";
        // Very small allow-list to avoid SQL injection in test code.
        return /^[a-zA-Z0-9_]+$/.test(value) ? value : "public";
      } catch {
        return "public";
      }
    })();

  const q = (table: string) => `"${schema}"."${table}"`;

  await prisma.$executeRawUnsafe(
    `
      TRUNCATE TABLE
        ${q("Notification")},
        ${q("AuditLog")},
        ${q("AuthToken")},
        ${q("AuthAttempt")},
        ${q("Request")},
        ${q("StockMovement")},
        ${q("StockLevel")},
        ${q("ItemVendor")},
        ${q("FileAttachment")},
        ${q("Session")},
        ${q("Account")},
        ${q("Supply")},
        ${q("Location")},
        ${q("ItemType")},
        ${q("Vendor")},
        ${q("SystemSetting")},
        ${q("User")}
      RESTART IDENTITY CASCADE;
    `
  );
}

export async function createAdminUser(overrides?: {
  username?: string;
  email?: string;
  password?: string;
}) {
  const prisma = await getPrisma();
  const password = await bcrypt.hash(overrides?.password ?? "AdminPass1", 10);

  return prisma.user.create({
    data: {
      username: overrides?.username ?? "admin",
      email: overrides?.email ?? "admin@example.com",
      password,
      role: Role.ADMIN,
    },
  });
}

export async function createStaffUser(overrides?: {
  username?: string;
  email?: string;
  password?: string;
}) {
  const prisma = await getPrisma();
  const password = await bcrypt.hash(overrides?.password ?? "StaffPass1", 10);

  return prisma.user.create({
    data: {
      username: overrides?.username ?? "staffuser",
      email: overrides?.email ?? "staff@example.com",
      password,
      role: Role.STAFF,
    },
  });
}
