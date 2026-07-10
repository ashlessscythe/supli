"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { SlidersHorizontal } from "lucide-react";
import { useStockMovements } from "@/hooks/use-stock-movements";

const adjustFormSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  newQuantity: z.coerce
    .number()
    .int()
    .min(0, "Quantity must be 0 or greater"),
  locationId: z.string().min(1, "Location is required"),
  reason: z.string().min(1, "Reason is required"),
});

type AdjustFormData = z.infer<typeof adjustFormSchema>;

interface Location {
  id: string;
  name: string;
}

interface SupplyOption {
  id: string;
  name: string;
  quantity: number;
}

interface StockLevelAtLocation {
  locationId: string;
  quantity: number;
}

interface AdjustDialogProps {
  supplies: SupplyOption[];
  locations: Location[];
  defaultSupplyId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function quantityAtLocation(
  stockLevels: StockLevelAtLocation[],
  locationId: string
) {
  return stockLevels.find((sl) => sl.locationId === locationId)?.quantity ?? 0;
}

export function AdjustDialog({
  supplies,
  locations,
  defaultSupplyId,
  trigger,
  open,
  onOpenChange,
}: AdjustDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [stockLevels, setStockLevels] = useState<StockLevelAtLocation[]>([]);
  const { handleAdjust, isLoading } = useStockMovements();

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const defaultLocationId = locations[0]?.id ?? "";

  const form = useForm<AdjustFormData>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: {
      supplyId: defaultSupplyId ?? "",
      newQuantity: 0,
      locationId: defaultLocationId,
      reason: "",
    },
  });

  const supplyId = form.watch("supplyId");
  const locationId = form.watch("locationId");
  const selectedSupply = supplies.find((s) => s.id === supplyId);
  const selectedLocation = locations.find((l) => l.id === locationId);

  useEffect(() => {
    if (!dialogOpen || !supplyId) {
      setStockLevels([]);
      return;
    }

    let cancelled = false;

    async function loadStockLevels() {
      const res = await fetch(`/api/supplies/${supplyId}/details`);
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;

      const levels: StockLevelAtLocation[] = (data.stockLevels ?? []).map(
        (sl: { locationId: string; quantity: number }) => ({
          locationId: sl.locationId,
          quantity: sl.quantity,
        })
      );
      setStockLevels(levels);

      const currentLocationId = form.getValues("locationId");
      form.setValue(
        "newQuantity",
        quantityAtLocation(levels, currentLocationId)
      );
    }

    loadStockLevels();

    return () => {
      cancelled = true;
    };
  }, [dialogOpen, supplyId, form]);

  useEffect(() => {
    if (!dialogOpen || !locationId) return;
    form.setValue("newQuantity", quantityAtLocation(stockLevels, locationId));
  }, [locationId, stockLevels, dialogOpen, form]);

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      supplyId: defaultSupplyId ?? "",
      newQuantity: 0,
      locationId: defaultLocationId,
      reason: "",
    });
  }, [dialogOpen, defaultSupplyId, defaultLocationId, form]);

  const onSubmit = async (data: AdjustFormData) => {
    const success = await handleAdjust({
      supplyId: data.supplyId,
      newQuantity: data.newQuantity,
      locationId: data.locationId,
      reason: data.reason,
    });

    if (success) {
      form.reset();
      setDialogOpen(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Adjust
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock Count</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          {supply.name} ({supply.quantity} total)
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

            <FormField
              control={form.control}
              name="newQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Physical count
                    {selectedLocation ? ` at ${selectedLocation.name}` : ""}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  {selectedSupply && (
                    <p className="text-xs text-muted-foreground">
                      Total across all locations: {selectedSupply.quantity}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Cycle count, damage, correction..."
                      {...field}
                    />
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
                Save count
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
