"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const linkFormSchema = z.object({
  entityId: z.string().min(1, "Selection is required"),
  vendorSku: z.string().optional(),
  internalSku: z.string().optional(),
  isPreferred: z.boolean().optional().default(false),
  leadTimeDays: z.string().optional(),
  moq: z.string().optional(),
  cost: z.string().optional(),
});

export type ItemVendorLinkFormValues = z.infer<typeof linkFormSchema>;

export interface ItemVendorLinkData {
  vendorSku?: string | null;
  internalSku?: string | null;
  isPreferred?: boolean;
  leadTimeDays?: number | null;
  moq?: number | null;
  cost?: number | null;
}

interface PickerOption {
  id: string;
  name: string;
}

interface ItemVendorLinkFormProps {
  mode: "pick-vendor" | "pick-supply";
  vendorId: string;
  supplyId?: string;
  excludeIds?: string[];
  initialData?: ItemVendorLinkData;
  submitLabel?: string;
  onSubmit: (values: {
    vendorId: string;
    supplyId: string;
    vendorSku?: string;
    internalSku?: string;
    isPreferred: boolean;
    leadTimeDays?: number;
    moq?: number;
    cost?: number;
  }) => Promise<void>;
  onCancel?: () => void;
}

function formatOptionalNumber(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function formatOptionalCost(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function ItemVendorLinkForm({
  mode,
  vendorId,
  supplyId,
  excludeIds = [],
  initialData,
  submitLabel = "Save link",
  onSubmit,
  onCancel,
}: ItemVendorLinkFormProps) {
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(!initialData);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(initialData);
  const pickerLabel = mode === "pick-vendor" ? "Vendor" : "Supply";

  const form = useForm<ItemVendorLinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      entityId: mode === "pick-supply" ? supplyId ?? "" : vendorId,
      vendorSku: initialData?.vendorSku ?? "",
      internalSku: initialData?.internalSku ?? "",
      isPreferred: initialData?.isPreferred ?? false,
      leadTimeDays:
        initialData?.leadTimeDays != null
          ? String(initialData.leadTimeDays)
          : "",
      moq: initialData?.moq != null ? String(initialData.moq) : "",
      cost: initialData?.cost != null ? String(initialData.cost) : "",
    },
  });

  useEffect(() => {
    if (isEdit) return;

    let cancelled = false;
    setLoadingOptions(true);

    const url = mode === "pick-vendor" ? "/api/vendors" : "/api/supplies";
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load options");
        const data = await res.json();
        if (cancelled) return;
        const mapped: PickerOption[] = Array.isArray(data)
          ? data.map((item: { id: string; name: string }) => ({
              id: item.id,
              name: item.name,
            }))
          : [];
        setOptions(
          mapped.filter((option) => !excludeIds.includes(option.id))
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, excludeIds, isEdit]);

  const handleSubmit = async (values: ItemVendorLinkFormValues) => {
    const resolvedSupplyId =
      mode === "pick-supply" ? values.entityId : supplyId ?? "";
    const resolvedVendorId =
      mode === "pick-vendor" ? values.entityId : vendorId;

    if (!resolvedSupplyId || !resolvedVendorId) return;

    setSubmitting(true);
    try {
      await onSubmit({
        vendorId: resolvedVendorId,
        supplyId: resolvedSupplyId,
        vendorSku: values.vendorSku?.trim() || undefined,
        internalSku: values.internalSku?.trim() || undefined,
        isPreferred: values.isPreferred,
        leadTimeDays: formatOptionalNumber(values.leadTimeDays),
        moq: formatOptionalNumber(values.moq),
        cost: formatOptionalCost(values.cost),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {!isEdit && (
          <FormField
            control={form.control}
            name="entityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{pickerLabel}</FormLabel>
                {loadingOptions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={options.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            options.length === 0
                              ? `No ${pickerLabel.toLowerCase()}s available`
                              : `Select ${pickerLabel.toLowerCase()}`
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendorSku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
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
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="leadTimeDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead time (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Optional"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="moq"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MOQ</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Optional"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Optional"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isPreferred"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <FormLabel className="mt-0">Preferred vendor</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting || loadingOptions}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
