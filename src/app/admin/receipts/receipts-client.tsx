"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReceiveDialog } from "@/components/inventory/receive-dialog";
import { logVendorReorder } from "@/lib/actions/stock-movement";
import Link from "next/link";

const logOrderSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  vendorId: z.string().optional(),
  externalPoNumber: z.string().optional(),
  notes: z.string().optional(),
});

type LogOrderFormData = z.infer<typeof logOrderSchema>;

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
}

interface VendorReorderRow {
  id: string;
  quantity: number;
  externalPoNumber: string | null;
  status: string;
  orderedAt: Date;
  supply: { id: string; name: string };
  vendor: { id: string; name: string } | null;
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
  const router = useRouter();
  const [isLogging, setIsLogging] = useState(false);

  const form = useForm<LogOrderFormData>({
    resolver: zodResolver(logOrderSchema),
    defaultValues: {
      supplyId: "",
      quantity: 1,
      vendorId: "",
      externalPoNumber: "",
      notes: "",
    },
  });

  const selectedSupplyId = form.watch("supplyId");
  const selectedSupply = supplies.find((s) => s.id === selectedSupplyId);
  const vendorOptions = selectedSupply?.itemVendors?.map((iv) => iv.vendor) ?? [];

  const onLogOrder = async (data: LogOrderFormData) => {
    try {
      setIsLogging(true);
      const result = await logVendorReorder({
        supplyId: data.supplyId,
        quantity: data.quantity,
        vendorId: data.vendorId || undefined,
        externalPoNumber: data.externalPoNumber || undefined,
        notes: data.notes || undefined,
      });

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((e) => e.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return;
      }

      toast.success("External order logged");
      form.reset();
      router.refresh();
    } catch {
      toast.error("Failed to log order");
    } finally {
      setIsLogging(false);
    }
  };

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
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onLogOrder)}
                  className="space-y-4 max-w-lg"
                >
                  <FormField
                    control={form.control}
                    name="supplyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supply</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supply" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {supplies.map((supply) => (
                              <SelectItem key={supply.id} value={supply.id}>
                                {supply.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity ordered</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {vendorOptions.length > 0 && (
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor (optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {vendorOptions.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="externalPoNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Corporate PO #</FormLabel>
                        <FormControl>
                          <Input placeholder="SAP / corporate PO number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLogging}>
                    Log order
                  </Button>
                </form>
              </Form>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>PO #</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openVendorReorders.map((reorder) => (
                      <TableRow key={reorder.id}>
                        <TableCell>{reorder.supply.name}</TableCell>
                        <TableCell>{reorder.vendor?.name ?? "—"}</TableCell>
                        <TableCell>{reorder.externalPoNumber ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {reorder.quantity}
                        </TableCell>
                        <TableCell className="capitalize">
                          {reorder.status.toLowerCase().replace("_", " ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts yet.</p>
          ) : (
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
                      {receipt.externalPoNumber
                        ? `PO ${receipt.externalPoNumber}`
                        : receipt.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
