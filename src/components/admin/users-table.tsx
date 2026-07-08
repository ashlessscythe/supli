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
import { formatDate } from "@/lib/utils";

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

export function UsersTable({
  data,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: UsersTableProps) {
  return (
    <div className="rounded-md border">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
