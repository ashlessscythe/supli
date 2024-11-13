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

const supplySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z.coerce
    .number()
    .min(0, "Minimum threshold must be 0 or greater"),
});

type SupplyFormData = z.infer<typeof supplySchema>;

interface SupplyFormProps {
  initialData?: SupplyFormData & { id: string };
}

export function SupplyForm({ initialData }: SupplyFormProps) {
  const { handleCreateSupply, handleUpdateSupply, isLoading } = useSupplies();

  const form = useForm<SupplyFormData>({
    resolver: zodResolver(supplySchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      quantity: 0,
      minimumThreshold: 0,
    },
  });

  const onSubmit = async (data: SupplyFormData) => {
    if (initialData) {
      await handleUpdateSupply(initialData.id, data);
    } else {
      await handleCreateSupply(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
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
