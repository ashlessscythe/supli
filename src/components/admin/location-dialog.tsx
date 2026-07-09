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

const locationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;

interface Location {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  isActive: boolean;
}

interface LocationDialogProps {
  location?: Location;
  onSubmit: (data: LocationFormValues & { id?: string }) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LocationDialog({
  location,
  onSubmit,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: LocationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name ?? "",
      type: location?.type ?? "",
      description: location?.description ?? "",
      isActive: location?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        type: location.type,
        description: location.description ?? "",
        isActive: location.isActive,
      });
      if (!isControlled) setInternalOpen(true);
    }
  }, [location, form, isControlled]);

  const handleSubmit = async (data: LocationFormValues) => {
    try {
      if (location) {
        await onSubmit({ ...data, id: location.id });
      } else {
        await onSubmit(data);
      }
      setOpen(false);
      form.reset({
        name: "",
        type: "",
        description: "",
        isActive: true,
      });
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!location && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {location ? "Edit Location" : "Add Location"}
          </DialogTitle>
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Office, Warehouse, Storage"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {location && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Inactive locations are hidden from stock operations.
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
              {location ? "Update Location" : "Create Location"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
