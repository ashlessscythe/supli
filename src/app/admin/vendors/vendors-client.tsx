"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  VendorDialog,
  type VendorFormValues,
} from "@/components/admin/vendor-dialog";
import { LinkedItemsDialog } from "@/components/admin/linked-items-dialog";
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

export function VendorsClient({ initialVendors }: VendorsClientProps) {
  const [vendors, setVendors] = useState(initialVendors);

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
          typeof error.error === "string" ? error.error : "Failed to create vendor"
        );
      }

      const newVendor = await response.json();
      setVendors((prev) =>
        [...prev, { ...newVendor, _count: { itemVendors: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Linked Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
