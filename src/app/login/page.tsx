"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { kioskLogin } from "@/lib/actions/kiosk";
import { listActiveSites } from "@/lib/actions/site";
import { KIOSK_USERNAME } from "@/lib/kiosk-constants";
import { isKioskUsername, MAIN_SITE_SLUG } from "@/lib/sites";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);

  useEffect(() => {
    void listActiveSites().then((result) => {
      if (result.success) setSites(result.data);
    });
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const username = values.username.trim().toLowerCase();
      if (username === KIOSK_USERNAME || isKioskUsername(username)) {
        const slug =
          username === KIOSK_USERNAME
            ? MAIN_SITE_SLUG
            : username.slice("kiosk-".length);
        const site = sites.find((s) => s.slug === slug);
        if (!site) {
          setError("Kiosk site not found. Use /kiosk/login instead.");
          return;
        }
        const kioskResult = await kioskLogin(site.id, values.password);
        if (!kioskResult.success) {
          setError(kioskResult.error ?? "Invalid username or password");
          return;
        }
        router.push("/kiosk");
        router.refresh();
        return;
      }

      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        try {
          const statusRes = await fetch("/api/auth/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: values.username,
              password: values.password,
            }),
          });
          const statusData = await statusRes.json();
          if (statusData.status === "pending") {
            setError(
              "Your account is pending admin approval. You cannot sign in yet."
            );
            return;
          }
        } catch {
          // fall through to generic error
        }
        setError("Invalid username or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-6 bg-card rounded-lg shadow-lg border">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Supli Mart
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <div className="flex justify-center gap-4 text-sm">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
          <Link href="/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your username"
                      {...field}
                      className="bg-background"
                    />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
