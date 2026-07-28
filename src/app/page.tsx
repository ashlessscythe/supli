import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";
import { homeJsonLd, homeMetadata } from "@/lib/site";

export const metadata: Metadata = homeMetadata;

export default async function Home() {
  const session = await auth();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <LandingPage initialSession={session} />
    </>
  );
}
