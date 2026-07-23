import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type TransactionClient = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function executeWithAudit<T>(
  userId: string,
  action: string,
  operation: (tx: TransactionClient) => Promise<T>,
  siteId?: string | null
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await operation(tx);
    await tx.auditLog.create({
      data: { userId, action, siteId: siteId ?? null },
    });
    return result;
  });
}

export async function executeWithAudits<T>(
  userId: string,
  actions: string[],
  operation: (tx: TransactionClient) => Promise<T>,
  siteId?: string | null
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await operation(tx);
    for (const action of actions) {
      await tx.auditLog.create({
        data: { userId, action, siteId: siteId ?? null },
      });
    }
    return result;
  });
}

export async function recordAudit(
  userId: string,
  action: string,
  tx?: TransactionClient,
  siteId?: string | null
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: { userId, action, siteId: siteId ?? null },
  });
}
