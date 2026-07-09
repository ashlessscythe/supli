import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Create an account",
  description: `Register for ${siteConfig.name}. Track supplies, vendor lead times, MOQ, and stock levels.`,
  alternates: { canonical: "/register" },
  openGraph: {
    title: `Create an account | ${siteConfig.name}`,
    description: `Register for ${siteConfig.name}. Track supplies, vendor lead times, MOQ, and stock levels.`,
    url: "/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
