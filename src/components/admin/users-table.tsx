"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role } from "@prisma/client";
import { MoreHorizontal, Edit, Trash, Check, X } from "lucide-react";
import { useFormatDate } from "@/components/providers/site-timezone-provider";

interface User {
  id: string;
  username: string;
  email?: string | null;
  role: Role;
  createdAt: string;
  _count: {
    requests: number;
  };
}

interface UsersTableProps {
  data: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onApprove?: (user: User) => void;
  onReject?: (user: User) => void;
}

function roleBadgeClass(role: Role) {
  if (role === Role.ADMIN) return "bg-purple-100 text-purple-800";
  if (role === Role.PENDING) return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

function UserActions({
  user,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onApprove?: (user: User) => void;
  onReject?: (user: User) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {user.role === Role.PENDING ? (
          <>
            <DropdownMenuItem onClick={() => onApprove?.(user)}>
              <Check className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onReject?.(user)}
              className="text-red-600"
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(user.id)}
              className="text-red-600"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersTable({
  data,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: UsersTableProps) {
  const formatDate = useFormatDate();
  return (
    <>
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Requests</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email ?? "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {user._count.requests}
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  <UserActions
                    user={user}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {data.length === 0 ? (
          <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          data.map((user) => (
            <div key={user.id} className="rounded-md border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium break-words">{user.username}</p>
                  {user.email && (
                    <p className="text-sm text-muted-foreground break-all">
                      {user.email}
                    </p>
                  )}
                </div>
                <UserActions
                  user={user}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Requests</p>
                  <p className="font-medium">{user._count.requests}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
