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
import { ClipboardList } from "lucide-react";
import { logVendorReorder } from "@/lib/actions/stock-movement";

const logOrderSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  vendorId: z.string().optional(),
  externalPoNumber: z.string().optional(),
  notes: z.string().optional(),
});

type LogOrderFormData = z.infer<typeof logOrderSchema>;

const SELECT_NONE = "__none__";

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

interface LogOrderDialogProps {
  supplies: SupplyOption[];
  defaultSupplyId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LogOrderDialog({
  supplies,
  defaultSupplyId,
  trigger,
  open,
  onOpenChange,
}: LogOrderDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const form = useForm<LogOrderFormData>({
    resolver: zodResolver(logOrderSchema),
    defaultValues: {
      supplyId: defaultSupplyId ?? "",
      quantity: 1,
      vendorId: "",
      externalPoNumber: "",
      notes: "",
    },
  });

  const setDialogOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
    if (!next) {
      form.reset({
        supplyId: defaultSupplyId ?? "",
        quantity: 1,
        vendorId: "",
        externalPoNumber: "",
        notes: "",
      });
    }
  };

  const selectedSupplyId = form.watch("supplyId");
  const selectedSupply = supplies.find((s) => s.id === selectedSupplyId);
  const vendorOptions = useMemo(() => {
    if (!selectedSupply?.itemVendors?.length) return [];
    return selectedSupply.itemVendors.map((iv) => iv.vendor);
  }, [selectedSupply]);

  const onSubmit = async (data: LogOrderFormData) => {
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
      form.reset({
        supplyId: defaultSupplyId ?? "",
        quantity: 1,
        vendorId: "",
        externalPoNumber: "",
        notes: "",
      });
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to log order");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline">
              <ClipboardList className="mr-2 h-4 w-4" />
              Log Order
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log order placed in corporate system</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLogging}>
                Log order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
