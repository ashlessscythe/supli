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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateSettings, updateKioskPassword } from "@/lib/actions/settings";
import {
  SITE_TIMEZONE_KEY,
  timeZoneOptionsForValue,
} from "@/lib/timezone";

const KIOSK_PASSWORD_KEY = "KIOSK_PASSWORD_HASH";

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
  const [kioskPassword, setKioskPassword] = useState("");
  const [isSavingKiosk, setIsSavingKiosk] = useState(false);

  // The kiosk password is stored as a hash and edited via a dedicated field,
  // so it should not be shown or round-tripped through the generic settings form.
  const visibleSettings = settings.filter(
    (setting) => setting.key !== KIOSK_PASSWORD_KEY
  );

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      settings: visibleSettings,
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setIsLoading(true);
      const result = await updateSettings(data.settings);

      if (!result.success) {
        const message = Array.isArray(result.error)
          ? result.error.map((e) => e.message).join(", ")
          : result.error;
        throw new Error(message);
      }

      toast.success("Settings updated successfully");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKioskPasswordUpdate = async () => {
    if (kioskPassword.trim().length < 4) {
      toast.error("Kiosk password must be at least 4 characters");
      return;
    }

    try {
      setIsSavingKiosk(true);
      const result = await updateKioskPassword(kioskPassword);

      if (!result.success) {
        const message = Array.isArray(result.error)
          ? result.error.map((e) => e.message).join(", ")
          : result.error;
        throw new Error(message);
      }

      toast.success("Kiosk password updated successfully");
      setKioskPassword("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update kiosk password"
      );
    } finally {
      setIsSavingKiosk(false);
    }
  };

  const formatSettingName = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {visibleSettings.map((setting, index) => (
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
                    ) : setting.key === SITE_TIMEZONE_KEY ? (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeZoneOptionsForValue(field.value).map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-none">Kiosk Password</p>
          <p className="text-sm text-muted-foreground">
            Password required to unlock the kiosk terminal. Enter a new value to
            change it; existing kiosk sessions will be signed out.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="password"
            placeholder="Enter new kiosk password"
            value={kioskPassword}
            onChange={(e) => setKioskPassword(e.target.value)}
            autoComplete="new-password"
            className="sm:w-[240px]"
          />
          <Button
            type="button"
            onClick={handleKioskPasswordUpdate}
            disabled={isSavingKiosk || kioskPassword.trim().length === 0}
          >
            {isSavingKiosk ? "Updating..." : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
