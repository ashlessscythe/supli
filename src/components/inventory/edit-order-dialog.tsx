"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from "lucide-react";
import { updateVendorReorder } from "@/lib/actions/stock-movement";

const editOrderSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  vendorId: z.string().optional(),
  externalPoNumber: z.string().optional(),
  notes: z.string().optional(),
});

type EditOrderFormData = z.infer<typeof editOrderSchema>;

const SELECT_NONE = "__none__";

export interface OpenOrderForEdit {
  id: string;
  quantity: number;
  externalPoNumber: string | null;
  status: string;
  notes: string | null;
  vendorId: string | null;
  receivedQuantity: number;
  remainingQuantity: number;
  supply: { id: string; name: string };
  vendor: { id: string; name: string } | null;
}

interface SupplyOption {
  id: string;
  itemVendors?: {
    vendor: { id: string; name: string };
  }[];
}

interface EditOrderDialogProps {
  order: OpenOrderForEdit;
  supplies: SupplyOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrderDialog({
  order,
  supplies,
  open,
  onOpenChange,
}: EditOrderDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const vendorOptions = useMemo(() => {
    const supply = supplies.find((s) => s.id === order.supply.id);
    return supply?.itemVendors?.map((iv) => iv.vendor) ?? [];
  }, [supplies, order.supply.id]);

  const form = useForm<EditOrderFormData>({
    resolver: zodResolver(editOrderSchema),
    values: {
      quantity: order.quantity,
      vendorId: order.vendorId ?? "",
      externalPoNumber: order.externalPoNumber ?? "",
      notes: order.notes ?? "",
    },
  });

  const onSubmit = async (data: EditOrderFormData) => {
    if (data.quantity < order.receivedQuantity) {
      form.setError("quantity", {
        message: `Quantity cannot be less than ${order.receivedQuantity} already received`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateVendorReorder(order.id, {
        quantity: data.quantity,
        vendorId: data.vendorId || null,
        externalPoNumber: data.externalPoNumber?.trim() || null,
        notes: data.notes?.trim() || null,
      });

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((e) => e.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return;
      }

      toast.success("Open order updated");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to update open order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit open order — {order.supply.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p>
            Received: {order.receivedQuantity} / {order.quantity}
          </p>
          <p className="text-muted-foreground">
            Remaining: {order.remainingQuantity}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity ordered</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={order.receivedQuantity || 1}
                      {...field}
                    />
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
