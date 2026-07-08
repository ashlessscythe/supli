import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Supli Mart — Office & Ops Inventory Management",
  description:
    "Track supplies, approve requests, and run floor kiosk checkout. Enterprise inventory management for warehouses, tool rooms, and office operations.",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  return <LandingPage initialSession={session} />;
}
