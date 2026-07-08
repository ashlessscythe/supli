"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Package, LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";
import { getAppHomeHref } from "@/lib/landing";

type LandingHeaderProps = {
  initialSession?: Session | null;
};

export function LandingHeader({ initialSession }: LandingHeaderProps) {
  const { data: clientSession } = useSession();
  const session = clientSession ?? initialSession ?? null;
  const user = session?.user;
  const appHref = getAppHomeHref(session);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Package className="h-6 w-6 text-primary" />
          <span>Supli Mart</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeSelector />
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Hi,{" "}
                <span className="font-medium text-foreground">
                  {user.username}
                </span>
              </span>
              <Button asChild size="sm">
                <Link href={appHref}>Go to app</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
