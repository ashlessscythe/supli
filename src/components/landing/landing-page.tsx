"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import type { Session } from "next-auth";
import { applyTheme } from "@/lib/apply-theme";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingShowcase } from "@/components/landing/landing-showcase";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

type LandingPageProps = {
  initialSession?: Session | null;
};

export function LandingPage({ initialSession }: LandingPageProps) {
  const { data: clientSession } = useSession();
  const { setTheme } = useTheme();
  const session = clientSession ?? initialSession ?? null;

  useEffect(() => {
    const stored = localStorage.getItem("supli-theme");
    if (!stored) {
      applyTheme("corporate");
      localStorage.setItem("supli-theme", "corporate");
      setTheme("dark");
    }
  }, [setTheme]);

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader initialSession={initialSession} />
      <main id="main-content" className="flex-1">
        <LandingHero session={session} />
        <LandingFeatures />
        <LandingShowcase />
        <LandingCta session={session} />
      </main>
      <LandingFooter />
    </div>
  );
}
