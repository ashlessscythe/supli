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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRequests } from "@/hooks/use-requests";
import { Supply } from "@/types";

const requestSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.coerce
    .number()
    .min(1, "Quantity must be at least 1")
    .max(1000, "Quantity cannot exceed 1000"),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  supplies: Supply[];
  onSuccess?: () => void;
}

export function RequestForm({ supplies, onSuccess }: RequestFormProps) {
  const { handleCreateRequest, isLoading } = useRequests();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      supplyId: "",
      quantity: 1,
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    const success = await handleCreateRequest(data);
    if (success && onSuccess) {
      form.reset();
      onSuccess();
    }
  };

  const selectedSupply = supplies.find(
    (supply) => supply.id === form.watch("supplyId")
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="supplyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supply</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supply" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {supplies.map((supply) => (
                    <SelectItem key={supply.id} value={supply.id}>
                      {supply.name} ({supply.quantity} available)
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
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  min={1}
                  max={selectedSupply?.quantity || 1000}
                />
              </FormControl>
              {selectedSupply && (
                <p className="text-sm text-muted-foreground">
                  Maximum available: {selectedSupply.quantity}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            Create Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
