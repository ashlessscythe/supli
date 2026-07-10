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
import { Button } from "@/components/ui/button";
import { ReceiveDialog } from "@/components/inventory/receive-dialog";
import { LogOrderDialog } from "@/components/inventory/log-order-dialog";
import {
  EditOrderDialog,
  type OpenOrderForEdit,
} from "@/components/inventory/edit-order-dialog";
import { Edit } from "lucide-react";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
}

interface SupplyOption {
  id: string;
  name: string;
  quantity: number;
  itemVendors?: {
    vendorId: string;
    vendor: { id: string; name: string };
    isPreferred: boolean;
  }[];
}

interface ReceiptRow {
  id: string;
  createdAt: Date;
  quantity: number;
  notes: string | null;
  supply: { id: string; name: string };
  location: { name: string };
  username: string;
  externalPoNumber: string | null;
  vendorName?: string | null;
  userNotes?: string | null;
}

function formatReceiptDetails(receipt: ReceiptRow) {
  return (
    [
      receipt.externalPoNumber ? `PO ${receipt.externalPoNumber}` : null,
      receipt.vendorName,
      receipt.userNotes,
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

interface VendorReorderRow extends OpenOrderForEdit {
  orderedAt: Date;
}

interface ReceiptsClientProps {
  supplies: SupplyOption[];
  locations: Location[];
  receipts: ReceiptRow[];
  openVendorReorders: VendorReorderRow[];
}

export function ReceiptsClient({
  supplies,
  locations,
  receipts,
  openVendorReorders,
}: ReceiptsClientProps) {
  const [editingOrder, setEditingOrder] = useState<VendorReorderRow | null>(
    null
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Receive inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiveDialog
            supplies={supplies}
            locations={locations}
            openVendorReorders={openVendorReorders}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log order placed in corporate system</CardTitle>
        </CardHeader>
        <CardContent>
          <LogOrderDialog supplies={supplies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open orders</CardTitle>
        </CardHeader>
        <CardContent>
          {openVendorReorders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open orders.</p>
          ) : (
            <>
              <div className="hidden rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>PO #</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[90px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openVendorReorders.map((reorder) => (
                      <TableRow key={reorder.id}>
                        <TableCell>{reorder.supply.name}</TableCell>
                        <TableCell>{reorder.vendor?.name ?? "—"}</TableCell>
                        <TableCell>
                          {reorder.externalPoNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {reorder.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {reorder.receivedQuantity}
                        </TableCell>
                        <TableCell className="capitalize">
                          {reorder.status.toLowerCase().replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingOrder(reorder)}
                          >
                            <Edit className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {openVendorReorders.map((reorder) => (
                  <div
                    key={reorder.id}
                    className="rounded-md border p-4 space-y-3"
                  >
                    <p className="font-medium break-words">
                      {reorder.supply.name}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Vendor</p>
                        <p className="font-medium">
                          {reorder.vendor?.name ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ordered</p>
                        <p className="font-medium">{reorder.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Received</p>
                        <p className="font-medium">{reorder.receivedQuantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">PO #</p>
                        <p className="font-medium break-all">
                          {reorder.externalPoNumber ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">
                          {reorder.status.toLowerCase().replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOrder(reorder)}
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit order
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {editingOrder && (
        <EditOrderDialog
          order={editingOrder}
          supplies={supplies}
          open
          onOpenChange={(open) => {
            if (!open) setEditingOrder(null);
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts yet.</p>
          ) : (
            <>
              <div className="hidden rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Notes / PO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(receipt.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/supplies?q=${encodeURIComponent(receipt.supply.name)}`}
                            className="hover:underline"
                          >
                            {receipt.supply.name}
                          </Link>
                        </TableCell>
                        <TableCell>{receipt.location.name}</TableCell>
                        <TableCell className="text-right">
                          +{receipt.quantity}
                        </TableCell>
                        <TableCell>{receipt.username}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {formatReceiptDetails(receipt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="rounded-md border p-4 space-y-3"
                  >
                    <div>
                      <Link
                        href={`/admin/supplies?q=${encodeURIComponent(receipt.supply.name)}`}
                        className="font-medium break-words hover:underline"
                      >
                        {receipt.supply.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {new Date(receipt.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">{receipt.location.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Qty</p>
                        <p className="font-medium">+{receipt.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">By</p>
                        <p className="font-medium">{receipt.username}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Notes / PO</p>
                        <p className="font-medium break-words">
                          {formatReceiptDetails(receipt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
