"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PackagePlus } from "lucide-react";
import { useStockMovements } from "@/hooks/use-stock-movements";
import { createSupply } from "@/lib/actions/supply";

const receiveFormSchema = z.object({
  supplyId: z.string().optional(),
  newName: z.string().optional(),
  newDescription: z.string().optional(),
  newBarcode: z.string().optional(),
  newInternalSku: z.string().optional(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  locationId: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
  vendorId: z.string().optional(),
  externalPoRef: z.string().optional(),
  vendorReorderId: z.string().optional(),
});

type ReceiveFormData = z.infer<typeof receiveFormSchema>;

const SELECT_NONE = "__none__";

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

interface VendorReorderOption {
  id: string;
  quantity: number;
  remainingQuantity?: number;
  externalPoNumber: string | null;
  supply: { id: string; name: string };
  vendor: { id: string; name: string } | null;
}

interface ReceiveDialogProps {
  supplies: SupplyOption[];
  locations: Location[];
  openVendorReorders?: VendorReorderOption[];
  defaultSupplyId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReceiveDialog({
  supplies,
  locations,
  openVendorReorders = [],
  defaultSupplyId,
  trigger,
  open,
  onOpenChange,
}: ReceiveDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [createNew, setCreateNew] = useState(false);
  const { handleReceive, isLoading } = useStockMovements();

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
    if (!next) setCreateNew(false);
  };

  const defaultLocationId = locations[0]?.id ?? "";

  const form = useForm<ReceiveFormData>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      supplyId: defaultSupplyId ?? "",
      quantity: 1,
      locationId: defaultLocationId,
      notes: "",
      vendorId: "",
      externalPoRef: "",
      vendorReorderId: "",
    },
  });

  const selectedSupplyId = form.watch("supplyId");
  const selectedSupply = supplies.find((s) => s.id === selectedSupplyId);
  const vendorOptions = useMemo(() => {
    if (!selectedSupply?.itemVendors?.length) return [];
    return selectedSupply.itemVendors.map((iv) => iv.vendor);
  }, [selectedSupply]);

  const openOrdersForSupply = useMemo(() => {
    if (!selectedSupplyId) return [];
    return openVendorReorders.filter(
      (reorder) =>
        reorder.supply.id === selectedSupplyId &&
        (reorder.remainingQuantity ?? reorder.quantity) > 0
    );
  }, [openVendorReorders, selectedSupplyId]);

  const selectedVendorReorderId = form.watch("vendorReorderId");

  useEffect(() => {
    if (!selectedVendorReorderId) return;
    const stillValid = openOrdersForSupply.some(
      (reorder) => reorder.id === selectedVendorReorderId
    );
    if (!stillValid) {
      form.setValue("vendorReorderId", "");
    }
  }, [openOrdersForSupply, selectedVendorReorderId, form]);

  const onSubmit = async (data: ReceiveFormData) => {
    let supplyId = data.supplyId;

    if (createNew) {
      if (!data.newName?.trim()) {
        form.setError("newName", { message: "Name is required for new items" });
        return;
      }
      const createResult = await createSupply({
        name: data.newName.trim(),
        description: data.newDescription?.trim() || data.newName.trim(),
        quantity: 0,
        minimumThreshold: 0,
        barcode: data.newBarcode || null,
        internalSku: data.newInternalSku || null,
      });
      if (!createResult.success) {
        const errorMessage = Array.isArray(createResult.error)
          ? createResult.error.map((e) => e.message).join(", ")
          : createResult.error;
        toast.error(errorMessage);
        return;
      }
      supplyId = createResult.data.id;
    }

    if (!supplyId) {
      form.setError("supplyId", { message: "Select a supply or create a new one" });
      return;
    }

    const success = await handleReceive({
      supplyId,
      quantity: data.quantity,
      locationId: data.locationId,
      notes: data.notes,
      vendorId: data.vendorId || undefined,
      externalPoRef: data.externalPoRef || undefined,
      vendorReorderId: data.vendorReorderId || undefined,
    });

    if (success) {
      form.reset({
        supplyId: defaultSupplyId ?? "",
        quantity: 1,
        locationId: defaultLocationId,
        notes: "",
        vendorId: "",
        externalPoRef: "",
        vendorReorderId: "",
      });
      setCreateNew(false);
      setDialogOpen(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <PackagePlus className="mr-2 h-4 w-4" />
              Receive Stock
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Receive Stock</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="create-new">New item</Label>
              <Switch
                id="create-new"
                checked={createNew}
                onCheckedChange={setCreateNew}
              />
            </div>

            {createNew ? (
              <>
                <FormField
                  control={form.control}
                  name="newName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="newBarcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newInternalSku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal SKU</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              <FormField
                control={form.control}
                name="supplyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supply</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supply" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supplies.map((supply) => (
                          <SelectItem key={supply.id} value={supply.id}>
                            {supply.name} ({supply.quantity} on hand)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qty received</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {vendorOptions.length > 0 && (
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (optional)</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === SELECT_NONE ? "" : value)
                      }
                      value={field.value ? field.value : SELECT_NONE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SELECT_NONE}>None</SelectItem>
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
              name="externalPoRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corporate PO # (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="External PO reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {openOrdersForSupply.length > 0 && (
              <FormField
                control={form.control}
                name="vendorReorderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to open order (optional)</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === SELECT_NONE ? "" : value)
                      }
                      value={field.value ? field.value : SELECT_NONE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SELECT_NONE}>None</SelectItem>
                        {openOrdersForSupply.map((reorder) => (
                          <SelectItem key={reorder.id} value={reorder.id}>
                            {reorder.quantity} ordered
                            {reorder.remainingQuantity != null
                              ? ` (${reorder.remainingQuantity} remaining)`
                              : ""}
                            {reorder.externalPoNumber
                              ? ` · PO ${reorder.externalPoNumber}`
                              : ""}
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                Receive
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
