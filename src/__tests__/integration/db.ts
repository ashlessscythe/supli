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

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.authToken.deleteMany(),
    prisma.authAttempt.deleteMany(),
    prisma.request.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.stockLevel.deleteMany(),
    prisma.itemVendor.deleteMany(),
    prisma.fileAttachment.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.supply.deleteMany(),
    prisma.location.deleteMany(),
    prisma.itemType.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.user.deleteMany(),
  ]);
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
