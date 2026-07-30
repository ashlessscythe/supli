"use client";

import { useCallback, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ClearFiltersButton } from "@/components/ui/clear-filters-button";
import { SortableHead } from "@/components/ui/sortable-head";
import { TablePagination } from "@/components/ui/table-pagination";
import { useClientTable } from "@/hooks/use-client-table";
import { useClearFiltersOnNavReselect } from "@/hooks/use-clear-filters-on-nav-reselect";
import { useRequests } from "@/hooks/use-requests";
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { useFormatDate } from "@/components/providers/site-timezone-provider";
import { Request } from "@/types";

interface RequestsTableProps {
  data: Request[];
  isAdmin: boolean;
}

type SortKey = "supply" | "requester" | "quantity" | "status" | "date";
type StatusFilter = "all" | "PENDING" | "APPROVED" | "DENIED";

export function RequestsTable({ data, isAdmin }: RequestsTableProps) {
  const formatDate = useFormatDate();
  const { handleUpdateStatus, isLoading } = useRequests();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filterFn = useCallback(
    (request: Request, term: string) => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      return (
        request.supply.name.toLowerCase().includes(term) ||
        request.user.username.toLowerCase().includes(term)
      );
    },
    [statusFilter]
  );

  const compareFn = useCallback(
    (a: Request, b: Request, sortKey: SortKey) => {
      switch (sortKey) {
        case "supply":
          return a.supply.name.localeCompare(b.supply.name);
        case "requester":
          return a.user.username.localeCompare(b.user.username);
        case "quantity":
          return a.quantity - b.quantity;
        case "status":
          return a.status.localeCompare(b.status);
        case "date":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    },
    []
  );

  const table = useClientTable({
    data,
    initialSortKey: "date" as SortKey,
    initialSortDirection: "desc",
    filterFn,
    compareFn,
  });
  const { clearSearch } = table;

  const clearFilters = useCallback(() => {
    clearSearch();
    setStatusFilter("all");
  }, [clearSearch]);

  useClearFiltersOnNavReselect(clearFilters);

  const filtersActive = table.search.trim() !== "" || statusFilter !== "all";

  const getStatusColor = (status: Request["status"]) => {
    switch (status) {
      case "APPROVED":
        return "text-green-600";
      case "DENIED":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const RequestActions = ({ request }: { request: Request }) => {
    if (!isAdmin || request.status !== "PENDING") return null;

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
          <DropdownMenuItem
            onClick={() => handleUpdateStatus(request.id, "APPROVED")}
            disabled={isLoading}
            className="text-green-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleUpdateStatus(request.id, "DENIED")}
            disabled={isLoading}
            className="text-red-600"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Deny
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const colSpan = isAdmin ? 6 : 5;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by supply or requester"
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              table.resetPage();
            }}
          >
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="DENIED">Denied</SelectItem>
            </SelectContent>
          </Select>
          <ClearFiltersButton
            onClick={clearFilters}
            disabled={!filtersActive}
          />
        </div>
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Supply"
                active={table.sortKey === "supply"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("supply")}
              />
              <SortableHead
                label="Requester"
                active={table.sortKey === "requester"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("requester")}
              />
              <SortableHead
                label="Quantity"
                active={table.sortKey === "quantity"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("quantity")}
                className="w-[100px] text-right"
              />
              <SortableHead
                label="Status"
                active={table.sortKey === "status"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("status")}
                className="w-[100px] text-right"
              />
              <SortableHead
                label="Date"
                active={table.sortKey === "date"}
                direction={table.sortDirection}
                onSort={() => table.toggleSort("date")}
                className="w-[150px]"
              />
              {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              table.paginated.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.supply.name}
                  </TableCell>
                  <TableCell>{request.user.username}</TableCell>
                  <TableCell className="text-right">
                    {request.quantity}
                  </TableCell>
                  <TableCell
                    className={`text-right ${getStatusColor(request.status)}`}
                  >
                    {request.status}
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <RequestActions request={request} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {table.paginated.length === 0 ? (
          <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            No requests found.
          </div>
        ) : (
          table.paginated.map((request) => (
            <div key={request.id} className="rounded-md border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {request.supply.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.user.username}
                  </p>
                </div>
                <RequestActions request={request} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{request.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p
                    className={`font-medium capitalize ${getStatusColor(request.status)}`}
                  >
                    {request.status.toLowerCase()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {formatDate(request.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
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
