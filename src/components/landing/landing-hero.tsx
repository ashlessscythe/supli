"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { getGetStartedHref } from "@/lib/landing";

type LandingHeroProps = {
  session: Session | null;
};

export function LandingHero({ session }: LandingHeroProps) {
  const ctaHref = getGetStartedHref(session);
  const isLoggedIn = Boolean(session?.user);

  return (
    <section className="landing-hero-bg relative overflow-hidden">
      <div className="container relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-20 text-center">
        <p className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          Supplies &amp; inventory management
        </p>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
            Track supplies.
          </span>
          <br />
          <span className="text-foreground">Approve requests.</span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-primary to-blue-600 bg-clip-text text-transparent">
            Run the floor.
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Real-time stock levels, supply requests, and vendor details like lead
          time and MOQ — plus a barcode kiosk for walk-up checkout. Built for
          the storeroom, ready to scale as you grow.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" className="h-12 px-8 text-base" asChild>
            <Link href={ctaHref}>
              {isLoggedIn ? "Go to your dashboard" : "Get started"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {!isLoggedIn && (
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base"
              asChild
            >
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>

        <p className="mt-12 text-xs tracking-wide text-muted-foreground/80 sm:text-sm">
          Next.js · Prisma · PostgreSQL · NextAuth
        </p>
      </div>
    </section>
  );
}
