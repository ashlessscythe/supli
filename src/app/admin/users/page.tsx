import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";

async function getUsers() {
  const users = await prisma.user.findMany({
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
  const users = await getUsers();

  return (
    <Suspense fallback={<div className="p-6">Loading users…</div>}>
      <UsersClient initialUsers={users} />
    </Suspense>
  );
}
