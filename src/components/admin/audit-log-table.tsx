"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
  user: {
    username: string;
  };
}

interface AuditLogTableProps {
  data: AuditLog[];
}

export function AuditLogTable({ data }: AuditLogTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.action}</TableCell>
              <TableCell>{log.user.username}</TableCell>
              <TableCell>{formatDate(log.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
