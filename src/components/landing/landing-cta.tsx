"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { getGetStartedHref } from "@/lib/landing";
import { Reveal } from "@/components/landing/reveal";

type LandingCtaProps = {
  session: Session | null;
};

export function LandingCta({ session }: LandingCtaProps) {
  const ctaHref = getGetStartedHref(session);
  const isLoggedIn = Boolean(session?.user);

  return (
    <section className="border-t bg-primary/5 py-24">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-card px-8 py-16 text-center shadow-sm sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {isLoggedIn
                ? "Welcome back — your inventory is waiting"
                : "Ready to modernize your supply ops?"}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {isLoggedIn
                ? "Jump back into your dashboard to manage supplies, requests, and alerts."
                : "Create an account and get admin approval to start tracking supplies across your organization."}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href={ctaHref}>
                  {isLoggedIn ? "Go to app" : "Get started free"}
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
          </div>
        </Reveal>
      </div>
    </section>
  );
}
