"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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
import {
  LocationDialog,
  type LocationFormValues,
} from "@/components/admin/location-dialog";
import { LinkedItemsDialog } from "@/components/admin/linked-items-dialog";
import { useClientTable } from "@/hooks/use-client-table";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  _count: { stockLevels: number };
}

interface LocationsClientProps {
  initialLocations: Location[];
}

type SortKey = "name" | "type" | "stockItems";
type StatusFilter = "all" | "active" | "inactive";

export function LocationsClient({ initialLocations }: LocationsClientProps) {
  const [locations, setLocations] = useState(initialLocations);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filterFn = useCallback(
    (loc: Location, term: string) => {
      if (statusFilter === "active" && !loc.isActive) return false;
      if (statusFilter === "inactive" && loc.isActive) return false;
      if (!term) return true;
      return (
        loc.name.toLowerCase().includes(term) ||
        loc.type.toLowerCase().includes(term)
      );
    },
    [statusFilter]
  );

  const compareFn = useCallback((a: Location, b: Location, sortKey: SortKey) => {
    if (sortKey === "stockItems") {
      return a._count.stockLevels - b._count.stockLevels;
    }
    return a[sortKey].localeCompare(b[sortKey]);
  }, []);

  const table = useClientTable({
    data: locations,
    initialSortKey: "name" as SortKey,
    filterFn,
    compareFn,
  });

  const handleCreate = async (data: LocationFormValues) => {
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          typeof error.error === "string"
            ? error.error
            : "Failed to create location"
        );
      }

      const newLocation = await response.json();
      setLocations((prev) => [
        ...prev,
        {
          id: newLocation.id,
          name: newLocation.name,
          type: newLocation.type,
          isActive: newLocation.isActive,
          _count: { stockLevels: 0 },
        },
      ]);
      toast.success("Location created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create location"
      );
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Locations</h2>
          <p className="text-muted-foreground">
            Inventory locations across your organization
          </p>
        </div>
        <LocationDialog onSubmit={handleCreate} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search by name or type"
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Name"
                    active={table.sortKey === "name"}
                    direction={table.sortDirection}
                    onSort={() => table.toggleSort("name")}
                  />
                  <SortableHead
                    label="Type"
                    active={table.sortKey === "type"}
                    direction={table.sortDirection}
                    onSort={() => table.toggleSort("type")}
                  />
                  <SortableHead
                    label="Stock Items"
                    active={table.sortKey === "stockItems"}
                    direction={table.sortDirection}
                    onSort={() => table.toggleSort("stockItems")}
                  />
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No locations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.paginated.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell>{loc.type}</TableCell>
                      <TableCell>
                        <LinkedItemsDialog
                          count={loc._count.stockLevels}
                          title={`Stock items at ${loc.name}`}
                          description="Supplies stocked at this location. Select one to view it in Supplies."
                          fetchUrl={`/api/locations/${loc.id}/items`}
                        />
                      </TableCell>
                      <TableCell>
                        {loc.isActive ? "Active" : "Inactive"}
                      </TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
