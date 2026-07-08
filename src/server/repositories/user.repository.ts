import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import type { TransactionClient } from "@/server/audit";

export const userRepository = {
  findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        _count: { select: { requests: true } },
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
        createdAt: true,
      },
    });
  },

  findPending() {
    return prisma.user.findMany({
      where: { role: Role.PENDING },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
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

  countAdmins() {
    return prisma.user.count({ where: { role: Role.ADMIN } });
  },

  create(
    data: { username: string; email?: string | null; password: string; role: Role },
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
        createdAt: true,
      },
    });
  },

  update(
    id: string,
    data: {
      username: string;
      email?: string | null;
      password?: string;
      role: Role;
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
        createdAt: true,
      },
    });
  },

  delete(id: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    return client.user.delete({ where: { id } });
  },
};
