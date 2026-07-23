import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import type { TransactionClient } from "@/server/audit";
import { isKioskUsername } from "@/lib/sites";

const userListSelect = {
  id: true,
  username: true,
  email: true,
  emailVerified: true,
  role: true,
  siteId: true,
  createdAt: true,
  _count: { select: { requests: true } },
} as const;

export const userRepository = {
  findAll(siteId: string) {
    return prisma.user.findMany({
      where: {
        siteId,
        NOT: { username: { startsWith: "kiosk-" } },
      },
      select: userListSelect,
      orderBy: { username: "asc" },
    });
  },

  findAllForSuperAdmin() {
    return prisma.user.findMany({
      where: {
        NOT: { username: { startsWith: "kiosk-" } },
      },
      select: {
        ...userListSelect,
        site: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { username: "asc" },
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        role: true,
        siteId: true,
        createdAt: true,
      },
    });
  },

  findPending(siteId: string) {
    return prisma.user.findMany({
      where: { role: Role.PENDING, siteId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        siteId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  countAdmins(siteId: string) {
    return prisma.user.count({
      where: {
        role: Role.ADMIN,
        siteId,
        NOT: { username: { startsWith: "kiosk-" } },
      },
    });
  },

  create(
    data: {
      username: string;
      email?: string | null;
      password: string;
      role: Role;
      siteId: string | null;
    },
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        siteId: true,
        createdAt: true,
      },
    });
  },

  update(
    id: string,
    data: {
      username?: string;
      email?: string | null;
      password?: string;
      role?: Role;
      siteId?: string | null;
      emailVerified?: Date | null;
    },
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        role: true,
        siteId: true,
        createdAt: true,
      },
    });
  },

  delete(id: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    return client.user.delete({ where: { id } });
  },

  isSystemKiosk(username: string) {
    return isKioskUsername(username);
  },
};
