"use client";

import { useMemo, useState } from "react";
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
import { useSupplies } from "@/hooks/use-supplies";
import { SupplyDialog } from "@/components/supplies/supply-dialog";
import { SupplyDetailDialog } from "@/components/supplies/supply-detail-dialog";
import { ReceiveDialog } from "@/components/inventory/receive-dialog";
import { AdjustDialog } from "@/components/inventory/adjust-dialog";
import { formatBarcode } from "@/lib/barcode";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Edit,
  Trash,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  SlidersHorizontal,
} from "lucide-react";
import { Supply } from "@/types";

interface LocationOption {
  id: string;
  name: string;
}

interface SuppliesTableProps {
  data: Supply[];
  isAdmin: boolean;
  initialSearch?: string;
  locations?: LocationOption[];
}

type SortKey = "name" | "quantity" | "minimumThreshold";
type SortDirection = "asc" | "desc";
type StockFilter = "all" | "low" | "ok";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const ALL_PAGE_SIZE = -1;

export function SuppliesTable({
  data,
  isAdmin,
  initialSearch = "",
  locations = [],
}: SuppliesTableProps) {
  const { handleDeleteSupply, isLoading } = useSupplies();
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [receivingSupplyId, setReceivingSupplyId] = useState<string | null>(
    null
  );
  const [adjustingSupplyId, setAdjustingSupplyId] = useState<string | null>(
    null
  );
  const [detailSupplyId, setDetailSupplyId] = useState<string | null>(null);

  const [search, setSearch] = useState(initialSearch);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(0);

  const supplyOptions = useMemo(
    () =>
      data.map((s) => ({
        id: s.id,
        name: s.name,
        quantity: s.quantity,
      })),
    [data]
  );

  const isLowStock = (supply: Supply) =>
    supply.quantity <= supply.minimumThreshold;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(0);
  };

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = data.filter((supply) => {
      if (stockFilter === "low" && !isLowStock(supply)) return false;
      if (stockFilter === "ok" && isLowStock(supply)) return false;

      if (!term) return true;
      return (
        supply.name.toLowerCase().includes(term) ||
        supply.description?.toLowerCase().includes(term) ||
        supply.barcode?.toLowerCase().includes(term) ||
        supply.internalSku?.toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a[sortKey] - b[sortKey];
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, search, stockFilter, sortKey, sortDirection]);

  const total = filteredSorted.length;
  const showAll = pageSize === ALL_PAGE_SIZE;
  const pageCount = showAll ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const paginated = showAll
    ? filteredSorted
    : filteredSorted.slice(
        currentPage * pageSize,
        currentPage * pageSize + pageSize
      );

  const rangeStart = total === 0 ? 0 : showAll ? 1 : currentPage * pageSize + 1;
  const rangeEnd = showAll
    ? total
    : Math.min(currentPage * pageSize + pageSize, total);

  const SortableHead = ({
    label,
    sortField,
    className,
  }: {
    label: string;
    sortField: SortKey;
    className?: string;
  }) => {
    const active = sortKey === sortField;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(sortField)}
          className={cn(
            "-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground",
            active ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {label}
          {active ? (
            sortDirection === "asc" ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          )}
        </button>
      </TableHead>
    );
  };

  const RowActions = ({ supply }: { supply: Supply }) => (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {locations.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReceivingSupplyId(supply.id)}
          >
            <PackagePlus className="mr-1 h-3.5 w-3.5" />
            Receive
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdjustingSupplyId(supply.id)}
            >
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
              Adjust
            </Button>
          )}
        </>
      )}
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
            onSelect={(e) => {
              e.preventDefault();
              setEditingSupply(supply);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem
              onClick={() => handleDeleteSupply(supply.id)}
              className="text-red-600"
              disabled={isLoading}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, description, barcode, or SKU"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={stockFilter}
          onValueChange={(value) => {
            setStockFilter(value as StockFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Filter stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="ok">In stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Name" sortField="name" />
              <TableHead>Description</TableHead>
              <TableHead>Barcode</TableHead>
              <SortableHead
                label="Quantity"
                sortField="quantity"
                className="w-[100px] text-right"
              />
              <SortableHead
                label="Min. Threshold"
                sortField="minimumThreshold"
                className="w-[100px] text-right"
              />
              <TableHead className="w-[280px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No supplies found.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((supply) => (
                <TableRow
                  key={supply.id}
                  className="cursor-pointer"
                  onClick={() => setDetailSupplyId(supply.id)}
                >
                  <TableCell className="font-medium">{supply.name}</TableCell>
                  <TableCell>{supply.description}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {supply.barcode ? formatBarcode(supply.barcode) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        isLowStock(supply) && "text-red-500"
                      )}
                    >
                      {supply.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {supply.minimumThreshold}
                  </TableCell>
                  <TableCell>
                    <RowActions supply={supply} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {paginated.length === 0 ? (
          <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            No supplies found.
          </div>
        ) : (
          paginated.map((supply) => (
            <div
              key={supply.id}
              className="cursor-pointer rounded-md border p-4 space-y-3 transition-colors hover:bg-accent/30"
              onClick={() => setDetailSupplyId(supply.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium break-words">{supply.name}</p>
                  {supply.description && (
                    <p className="text-sm text-muted-foreground break-words">
                      {supply.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p
                    className={cn(
                      "font-medium",
                      isLowStock(supply) && "text-red-500"
                    )}
                  >
                    {supply.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Min. Threshold</p>
                  <p className="font-medium">{supply.minimumThreshold}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Barcode</p>
                  <p className="font-mono text-sm break-all">
                    {supply.barcode ? formatBarcode(supply.barcode) : "—"}
                  </p>
                </div>
              </div>

              <RowActions supply={supply} />
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
              <SelectItem value={String(ALL_PAGE_SIZE)}>All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {rangeStart}–{rangeEnd} of {total}
          </span>
          {!showAll && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Previous</span>
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <SupplyDetailDialog
        supplyId={detailSupplyId}
        open={detailSupplyId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSupplyId(null);
        }}
      />

      {editingSupply && (
        <SupplyDialog
          key={editingSupply.id}
          initialData={editingSupply}
          isAdmin={isAdmin}
          trigger={null}
          open
          onOpenChange={(open) => {
            if (!open) setEditingSupply(null);
          }}
        />
      )}

      {locations.length > 0 && receivingSupplyId && (
        <ReceiveDialog
          key={receivingSupplyId}
          supplies={supplyOptions}
          locations={locations}
          defaultSupplyId={receivingSupplyId}
          trigger={null}
          open
          onOpenChange={(open) => {
            if (!open) setReceivingSupplyId(null);
          }}
        />
      )}

      {isAdmin && locations.length > 0 && adjustingSupplyId && (
        <AdjustDialog
          key={adjustingSupplyId}
          supplies={supplyOptions}
          locations={locations}
          defaultSupplyId={adjustingSupplyId}
          trigger={null}
          open
          onOpenChange={(open) => {
            if (!open) setAdjustingSupplyId(null);
          }}
        />
      )}

    </div>
  );
}
