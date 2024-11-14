"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

// Schema for creating a new user
const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

// Schema for updating an existing user
const updateUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z
    .string()
    .optional()
    .or(
      z.string().min(6, "Password must be at least 6 characters if provided")
    ),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

interface User {
  id: string;
  username: string;
  role: Role;
}

interface UserDialogProps {
  user?: User;
  onSubmit: (
    data: (CreateUserFormValues | UpdateUserFormValues) & { id?: string }
  ) => Promise<void>;
  trigger?: React.ReactNode;
}

export function UserDialog({ user, onSubmit, trigger }: UserDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateUserFormValues | UpdateUserFormValues>({
    resolver: zodResolver(user ? updateUserSchema : createUserSchema),
    defaultValues: {
      username: user?.username || "",
      password: "",
      role: user?.role || Role.STAFF,
    },
  });

  // Reset form when user prop changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        password: "",
        role: user.role,
      });
      setOpen(true);
    }
  }, [user, form]);

  const handleSubmit = async (
    data: CreateUserFormValues | UpdateUserFormValues
  ) => {
    try {
      // If updating and password is empty, remove it from the data
      if (user) {
        const updateData = {
          username: data.username,
          role: data.role,
          id: user.id,
          ...(data.password ? { password: data.password } : {}),
        };
        await onSubmit(updateData);
      } else {
        await onSubmit(data as CreateUserFormValues);
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {user ? "New Password (optional)" : "Password"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                      <SelectItem value={Role.STAFF}>Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              {user ? "Update User" : "Create User"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
