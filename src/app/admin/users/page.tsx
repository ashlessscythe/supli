import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          requests: true,
        },
      },
    },
    orderBy: {
      username: "asc",
    },
  });

  // Convert Date objects to ISO strings before passing to client
  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return <UsersClient initialUsers={users} />;
}
