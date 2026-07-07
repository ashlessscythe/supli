import { z } from "zod";

export const settingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string(),
});

export const settingsSchema = z.array(settingSchema);

export type SettingInput = z.infer<typeof settingSchema>;
