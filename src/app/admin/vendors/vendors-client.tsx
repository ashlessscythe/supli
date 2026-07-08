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
import { SortableHead } from "@/components/ui/sortable-head";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  VendorDialog,
  type VendorFormValues,
} from "@/components/admin/vendor-dialog";
import { LinkedItemsDialog } from "@/components/admin/linked-items-dialog";
import { useClientTable } from "@/hooks/use-client-table";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  website: string | null;
  _count: { itemVendors: number };
}

interface VendorsClientProps {
  initialVendors: Vendor[];
}

type SortKey = "name" | "contact" | "linkedItems";

export function VendorsClient({ initialVendors }: VendorsClientProps) {
  const [vendors, setVendors] = useState(initialVendors);

  const filterFn = useCallback((vendor: Vendor, term: string) => {
    if (!term) return true;
    return (
      vendor.name.toLowerCase().includes(term) ||
      vendor.contact?.toLowerCase().includes(term) === true ||
      vendor.website?.toLowerCase().includes(term) === true
    );
  }, []);

  const compareFn = useCallback((a: Vendor, b: Vendor, sortKey: SortKey) => {
    if (sortKey === "linkedItems") {
      return a._count.itemVendors - b._count.itemVendors;
    }
    if (sortKey === "contact") {
      return (a.contact ?? "").localeCompare(b.contact ?? "");
    }
    return a.name.localeCompare(b.name);
  }, []);

  const table = useClientTable({
    data: vendors,
    initialSortKey: "name" as SortKey,
    filterFn,
    compareFn,
  });

  const handleCreate = async (data: VendorFormValues) => {
    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          typeof error.error === "string"
            ? error.error
            : "Failed to create vendor"
        );
      }

      const newVendor = await response.json();
      setVendors((prev) => [
        ...prev,
        { ...newVendor, _count: { itemVendors: 0 } },
      ]);
      toast.success("Vendor created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vendor"
      );
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vendors</h2>
          <p className="text-muted-foreground">
            Supplier and vendor management
          </p>
        </div>
        <VendorDialog onSubmit={handleCreate} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search by name, contact, or website"
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
                    label="Name"
                    active={table.sortKey === "name"}
                    direction={table.sortDirection}
                    onSort={() => table.toggleSort("name")}
                  />
                  <SortableHead
                    label="Contact"
                    active={table.sortKey === "contact"}
                    direction={table.sortDirection}
                    onSort={() => table.toggleSort("contact")}
                  />
                  <TableHead>Website</TableHead>
                  <SortableHead
                    label="Linked Items"
                    active={table.sortKey === "linkedItems"}
                    direction={table.sortDirection}
                    onSort={() => table.toggleSort("linkedItems")}
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
                      No vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.paginated.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        {vendor.name}
                      </TableCell>
                      <TableCell>{vendor.contact ?? "—"}</TableCell>
                      <TableCell>
                        {vendor.website ? (
                          <a
                            href={vendor.website}
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {vendor.website}
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <LinkedItemsDialog
                          count={vendor._count.itemVendors}
                          title={`Items supplied by ${vendor.name}`}
                          description="Supplies linked to this vendor. Select one to view it in Supplies."
                          fetchUrl={`/api/vendors/${vendor.id}/items`}
                        />
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
