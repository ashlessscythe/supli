"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSupplies } from "@/hooks/use-supplies";
import { formatBarcode } from "@/lib/barcode";
import { SupplyVendorPricing } from "./supply-vendor-pricing";

const supplyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z.coerce
    .number()
    .min(0, "Minimum threshold must be 0 or greater"),
  barcode: z.string().optional(),
  internalSku: z.string().optional(),
});

type SupplyFormData = z.infer<typeof supplyFormSchema>;

interface SupplyInitialData {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minimumThreshold: number;
  barcode?: string | null;
  internalSku?: string | null;
}

interface SupplyFormProps {
  initialData?: SupplyInitialData;
  isAdmin?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SupplyForm({
  initialData,
  isAdmin = false,
  onSuccess,
  onCancel,
}: SupplyFormProps) {
  const { handleCreateSupply, handleUpdateSupply, isLoading } = useSupplies();

  const form = useForm<SupplyFormData>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      quantity: initialData?.quantity ?? 0,
      minimumThreshold: initialData?.minimumThreshold ?? 0,
      barcode: formatBarcode(initialData?.barcode),
      internalSku: initialData?.internalSku ?? "",
    },
  });

  const onSubmit = async (data: SupplyFormData) => {
    const trimmedBarcode = data.barcode?.trim();
    const trimmedSku = data.internalSku?.trim();

    const payload = isAdmin
      ? {
          name: data.name,
          description: data.description,
          quantity: data.quantity,
          minimumThreshold: data.minimumThreshold,
          barcode: trimmedBarcode ? trimmedBarcode : null,
          internalSku: trimmedSku ? trimmedSku : null,
        }
      : {
          description: data.description,
          quantity: data.quantity,
          minimumThreshold: data.minimumThreshold,
        };

    const success = initialData
      ? await handleUpdateSupply(initialData.id, payload)
      : await handleCreateSupply(payload as Parameters<typeof handleCreateSupply>[0]);

    if (success) {
      form.reset();
      onSuccess?.();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isAdmin ? (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter supply name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          initialData && (
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Name</p>
              <p className="text-sm text-muted-foreground">
                {initialData.name}
              </p>
            </div>
          )
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter supply description"
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    {...field}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimumThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Threshold</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter minimum threshold"
                    {...field}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Scan or enter barcode"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internalSku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal SKU</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter internal SKU"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {isAdmin && initialData && (
          <SupplyVendorPricing supplyId={initialData.id} />
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => (onCancel ? onCancel() : window.history.back())}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {initialData ? "Update" : "Create"} Supply
          </Button>
        </div>
      </form>
    </Form>
  );
}
