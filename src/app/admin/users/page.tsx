import { requireAdminPage } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";
import { Suspense } from "react";

async function getUsers(siteId: string) {
  const users = await prisma.user.findMany({
    where: {
      siteId,
      NOT: { username: { startsWith: "kiosk-" } },
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          requests: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));
}

export default async function AdminUsersPage() {
  const ctx = await requireAdminPage();
  const users = await getUsers(ctx.siteId);

  return (
    <Suspense fallback={<div className="p-6">Loading users…</div>}>
      <UsersClient initialUsers={users} />
    </Suspense>
  );
}
