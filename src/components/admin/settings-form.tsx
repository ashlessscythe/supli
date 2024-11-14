"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateSettings } from "@/lib/actions/settings";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
}

interface SettingsFormProps {
  settings: Setting[];
}

const settingsSchema = z.object({
  settings: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      description: z.string(),
    })
  ),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      settings,
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setIsLoading(true);
      const result = await updateSettings(data.settings);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Settings updated successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSettingName = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {settings.map((setting, index) => (
          <FormField
            key={setting.id}
            control={form.control}
            name={`settings.${index}.value`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>{formatSettingName(setting.key)}</FormLabel>
                  <FormDescription>{setting.description}</FormDescription>
                </div>
                <FormControl>
                  {setting.key === "ALLOW_ALL_REQUESTS_VISIBLE" ? (
                    <Switch
                      checked={field.value === "true"}
                      onCheckedChange={(checked: boolean) => {
                        field.onChange(checked.toString());
                      }}
                    />
                  ) : (
                    <Input {...field} className="w-[200px]" />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button type="submit" disabled={isLoading}>
          Save changes
        </Button>
      </form>
    </Form>
  );
}
