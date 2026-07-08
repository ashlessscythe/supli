"use client";

import { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SortableHead } from "@/components/ui/sortable-head";
import { TablePagination } from "@/components/ui/table-pagination";
import { useClientTable } from "@/hooks/use-client-table";
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

type SortKey = "action" | "user" | "date";

export function AuditLogTable({ data }: AuditLogTableProps) {
  const filterFn = useCallback((log: AuditLog, term: string) => {
    if (!term) return true;
    return (
      log.action.toLowerCase().includes(term) ||
      log.user.username.toLowerCase().includes(term)
    );
  }, []);

  const compareFn = useCallback((a: AuditLog, b: AuditLog, sortKey: SortKey) => {
    switch (sortKey) {
      case "action":
        return a.action.localeCompare(b.action);
      case "user":
        return a.user.username.localeCompare(b.user.username);
      case "date":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      default:
        return 0;
    }
  }, []);

  const table = useClientTable({
    data,
    initialSortKey: "date" as SortKey,
    initialSortDirection: "desc",
    filterFn,
    compareFn,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by action or user"
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Action"
                active={table.sortKey === "action"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("action")}
              />
              <SortableHead
                label="User"
                active={table.sortKey === "user"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("user")}
              />
              <SortableHead
                label="Date"
                active={table.sortKey === "date"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("date")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              table.paginated.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.user.username}</TableCell>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        pageSize={table.pageSize}
        onPageSizeChange={table.setPageSize}
        page={table.page}
        pageCount={table.pageCount}
        showAll={table.showAll}
        rangeStart={table.rangeStart}
        rangeEnd={table.rangeEnd}
        total={table.total}
        onPrevious={() => table.setPage((p) => Math.max(0, p - 1))}
        onNext={() =>
          table.setPage((p) => Math.min(table.pageCount - 1, p + 1))
        }
      />
    </div>
  );
}
