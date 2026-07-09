"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

const vendorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional(),
  website: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  website: string | null;
  notes?: string | null;
  isActive?: boolean;
}

interface VendorDialogProps {
  vendor?: Vendor;
  onSubmit: (data: VendorFormValues & { id?: string }) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VendorDialog({
  vendor,
  onSubmit,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: VendorDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: vendor?.name ?? "",
      contact: vendor?.contact ?? "",
      website: vendor?.website ?? "",
      notes: vendor?.notes ?? "",
      isActive: vendor?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (vendor) {
      form.reset({
        name: vendor.name,
        contact: vendor.contact ?? "",
        website: vendor.website ?? "",
        notes: vendor.notes ?? "",
        isActive: vendor.isActive ?? true,
      });
      if (!isControlled) setInternalOpen(true);
    }
  }, [vendor, form, isControlled]);

  const handleSubmit = async (data: VendorFormValues) => {
    try {
      if (vendor) {
        await onSubmit({ ...data, id: vendor.id });
      } else {
        await onSubmit(data);
      }
      setOpen(false);
      form.reset({
        name: "",
        contact: "",
        website: "",
        notes: "",
        isActive: true,
      });
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!vendor && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
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
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                      value={field.value || ""}
                    />
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
                    <Textarea {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {vendor && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Inactive vendors are hidden from ordering workflows.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full">
              {vendor ? "Update Vendor" : "Create Vendor"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
