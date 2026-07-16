"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableHead } from "@/components/ui/sortable-head";
import { TablePagination } from "@/components/ui/table-pagination";
import { useClientTable } from "@/hooks/use-client-table";
import {
  auditDirectionLabel,
  classifyAuditDirection,
  type AuditDirection,
} from "@/lib/audit-action";
import { cn, formatDate } from "@/lib/utils";

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

type SortKey = "action" | "user" | "date" | "type";
type TypeFilter = "all" | AuditDirection;

export function AuditLogTable({ data }: AuditLogTableProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const typedData = useMemo(() => {
    if (typeFilter === "all") return data;
    return data.filter(
      (log) => classifyAuditDirection(log.action) === typeFilter
    );
  }, [data, typeFilter]);

  const filterFn = useCallback((log: AuditLog, term: string) => {
    if (!term) return true;
    const direction = classifyAuditDirection(log.action);
    const typeLabel = auditDirectionLabel(direction).toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.user.username.toLowerCase().includes(term) ||
      typeLabel.includes(term)
    );
  }, []);

  const compareFn = useCallback((a: AuditLog, b: AuditLog, sortKey: SortKey) => {
    switch (sortKey) {
      case "action":
        return a.action.localeCompare(b.action);
      case "user":
        return a.user.username.localeCompare(b.user.username);
      case "type":
        return classifyAuditDirection(a.action).localeCompare(
          classifyAuditDirection(b.action)
        );
      case "date":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      default:
        return 0;
    }
  }, []);

  const table = useClientTable({
    data: typedData,
    initialSortKey: "date" as SortKey,
    initialSortDirection: "desc",
    filterFn,
    compareFn,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by action, user, or type"
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value as TypeFilter);
            table.resetPage();
          }}
        >
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="in">In</SelectItem>
            <SelectItem value="out">Out</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Type"
                active={table.sortKey === "type"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("type")}
              />
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
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              table.paginated.map((log) => {
                const direction = classifyAuditDirection(log.action);
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs font-medium uppercase tracking-wide",
                          direction === "in" &&
                            "text-emerald-700 dark:text-emerald-400",
                          direction === "out" &&
                            "text-amber-700 dark:text-amber-400",
                          direction === "other" && "text-muted-foreground"
                        )}
                      >
                        {auditDirectionLabel(direction)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.user.username}</TableCell>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                );
              })
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
