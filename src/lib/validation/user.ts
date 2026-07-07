import { z } from "zod";
import { Role } from "@prisma/client";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const userSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email is required").optional(),
  password: passwordSchema,
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1, "Username is required"),
  email: z.string().email().optional().nullable(),
  password: passwordSchema.optional(),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

export const inviteSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type UserInput = z.infer<typeof userSchema>;
