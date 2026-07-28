import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z
    .string()
    .min(1, "NEXTAUTH_SECRET (or AUTH_SECRET) is required")
    .optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  AUTH_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SUPERADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  SUPERADMIN_INITIAL_PASSWORD: z.string().min(8).optional().or(z.literal("")),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  const data = parsed.data;
  const secret = data.AUTH_SECRET || data.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Invalid environment variables:\n  - NEXTAUTH_SECRET: NEXTAUTH_SECRET (or AUTH_SECRET) is required"
    );
  }
  const url = data.AUTH_URL || data.NEXTAUTH_URL;
  if (!url) {
    throw new Error(
      "Invalid environment variables:\n  - NEXTAUTH_URL: NEXTAUTH_URL (or AUTH_URL) must be a valid URL"
    );
  }

  return {
    ...data,
    NEXTAUTH_SECRET: secret,
    NEXTAUTH_URL: url,
  };
}

export const env = validateEnv();
