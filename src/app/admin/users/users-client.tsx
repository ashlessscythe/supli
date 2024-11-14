"use client";

import { useState } from "react";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/components/admin/users-table";
import { UserDialog } from "@/components/admin/user-dialog";
import { toast } from "sonner";
import { z } from "zod";

interface BaseUser {
  id: string;
  username: string;
  role: Role;
}

interface UserWithDate extends BaseUser {
  createdAt: string;
  _count: {
    requests: number;
  };
}

// Match the schemas from UserDialog
const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

const updateUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

interface UsersClientProps {
  initialUsers: UserWithDate[];
}

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<UserWithDate | undefined>(
    undefined
  );

  const handleCreateUser = async (data: CreateUserFormValues) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const newUser = await response.json();
      setUsers((prev) => [...prev, { ...newUser, _count: { requests: 0 } }]);
      toast.success("User created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
      throw error;
    }
  };

  const handleUpdateUser = async (
    data: UpdateUserFormValues & { id?: string }
  ) => {
    if (!data.id) return;

    try {
      // Only include password in the request if it's provided
      const updateData = {
        id: data.id,
        username: data.username,
        role: data.role,
        ...(data.password ? { password: data.password } : {}),
      };

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const updatedUser = await response.json();
      setUsers((prev) =>
        prev.map((user) =>
          user.id === data.id
            ? {
                ...user,
                username: updatedUser.username,
                role: updatedUser.role,
              }
            : user
        )
      );
      setEditingUser(undefined);
      toast.success("User updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user"
      );
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user"
      );
      throw error;
    }
  };

  const handleSubmit = async (
    data: (CreateUserFormValues | UpdateUserFormValues) & { id?: string }
  ) => {
    if (data.id) {
      await handleUpdateUser(data as UpdateUserFormValues & { id: string });
    } else {
      await handleCreateUser(data as CreateUserFormValues);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            View and manage all users in the system
          </p>
        </div>
        <UserDialog onSubmit={handleSubmit} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            data={users}
            onEdit={setEditingUser}
            onDelete={handleDeleteUser}
          />
        </CardContent>
      </Card>

      {editingUser && (
        <UserDialog
          user={editingUser}
          onSubmit={handleSubmit}
          trigger={<></>}
        />
      )}
    </div>
  );
}
