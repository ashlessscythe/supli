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
import { Button } from "@/components/ui/button";
import { SortableHead } from "@/components/ui/sortable-head";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  VendorDialog,
  type VendorFormValues,
} from "@/components/admin/vendor-dialog";
import { LinkedItemsDialog } from "@/components/admin/linked-items-dialog";
import { VendorContactActions } from "@/components/vendors/vendor-contact-actions";
import { isVendorEmail, normalizeWebsiteUrl } from "@/lib/vendor-contact";
import { useClientTable } from "@/hooks/use-client-table";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  _count: { itemVendors: number };
}

interface VendorsClientProps {
  initialVendors: Vendor[];
}

type SortKey = "name" | "contact" | "linkedItems";

export function VendorsClient({ initialVendors }: VendorsClientProps) {
  const [vendors, setVendors] = useState(initialVendors);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

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

  const handleLinksChanged = (vendorId: string, newCount: number) => {
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.id === vendorId
          ? { ...vendor, _count: { itemVendors: newCount } }
          : vendor
      )
    );
  };

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
        {
          ...newVendor,
          notes: newVendor.notes ?? null,
          isActive: newVendor.isActive ?? true,
          _count: { itemVendors: 0 },
        },
      ]);
      toast.success("Vendor created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vendor"
      );
      throw error;
    }
  };

  const handleUpdate = async (data: VendorFormValues & { id?: string }) => {
    if (!data.id) return;

    try {
      const response = await fetch("/api/vendors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          typeof error.error === "string"
            ? error.error
            : "Failed to update vendor"
        );
      }

      const updated = await response.json();
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === updated.id
            ? {
                ...vendor,
                name: updated.name,
                contact: updated.contact,
                website: updated.website,
                notes: updated.notes ?? null,
                isActive: updated.isActive,
              }
            : vendor
        )
      );
      toast.success("Vendor updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update vendor"
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

          <div className="hidden rounded-md border md:block">
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
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {vendor.contact ? (
                            isVendorEmail(vendor.contact) ? (
                              <a
                                href={`mailto:${vendor.contact.trim()}`}
                                className="text-primary hover:underline"
                              >
                                {vendor.contact}
                              </a>
                            ) : (
                              vendor.contact
                            )
                          ) : (
                            "—"
                          )}
                          {isVendorEmail(vendor.contact) && (
                            <VendorContactActions contact={vendor.contact} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.website ? (
                          <div className="flex items-center gap-1">
                            <a
                              href={normalizeWebsiteUrl(vendor.website)}
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              {vendor.website}
                            </a>
                            <VendorContactActions website={vendor.website} />
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <LinkedItemsDialog
                          count={vendor._count.itemVendors}
                          title={`Items supplied by ${vendor.name}`}
                          description="Manage supplies linked to this vendor."
                          fetchUrl={`/api/vendors/${vendor.id}/items`}
                          vendorId={vendor.id}
                          onLinksChanged={handleLinksChanged}
                        />
                      </TableCell>
                      <TableCell>
                        {vendor.isActive ? "Active" : "Inactive"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingVendor(vendor)}
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {table.paginated.length === 0 ? (
              <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                No vendors found.
              </div>
            ) : (
              table.paginated.map((vendor) => (
                <div
                  key={vendor.id}
                  className="rounded-md border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <p className="font-medium break-words">{vendor.name}</p>
                      <VendorContactActions
                        website={vendor.website}
                        contact={vendor.contact}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingVendor(vendor)}
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Contact</p>
                      {vendor.contact ? (
                        isVendorEmail(vendor.contact) ? (
                          <a
                            href={`mailto:${vendor.contact.trim()}`}
                            className="font-medium break-words text-primary hover:underline"
                          >
                            {vendor.contact}
                          </a>
                        ) : (
                          <p className="font-medium break-words">
                            {vendor.contact}
                          </p>
                        )
                      ) : (
                        <p className="font-medium">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">
                        {vendor.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Website</p>
                      {vendor.website ? (
                        <a
                          href={normalizeWebsiteUrl(vendor.website)}
                          className="font-medium text-primary break-all hover:underline"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {vendor.website}
                        </a>
                      ) : (
                        <p className="font-medium">—</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Linked items</p>
                      <LinkedItemsDialog
                        count={vendor._count.itemVendors}
                        title={`Items supplied by ${vendor.name}`}
                        description="Manage supplies linked to this vendor."
                        fetchUrl={`/api/vendors/${vendor.id}/items`}
                        vendorId={vendor.id}
                        onLinksChanged={handleLinksChanged}
                      />
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
        </CardContent>
      </Card>

      {editingVendor && (
        <VendorDialog
          key={editingVendor.id}
          vendor={editingVendor}
          onSubmit={handleUpdate}
          open
          onOpenChange={(open) => {
            if (!open) setEditingVendor(null);
          }}
        />
      )}
    </div>
  );
}
