import { PrismaClient } from "@prisma/client";
import "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prismaByUrl: Map<string, PrismaClient> | undefined;
};

const urlKey = process.env.DATABASE_URL ?? "default";
const map = (globalForPrisma.prismaByUrl ??= new Map<string, PrismaClient>());
const existing = map.get(urlKey);

export const prisma =
  existing ??
  new PrismaClient({
    log: process.env.NODE_ENV === "test" ? [] : ["query"],
  });

if (!existing) map.set(urlKey, prisma);
