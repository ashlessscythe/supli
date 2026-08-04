import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-center safe-pad">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted/40">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="text-sm text-muted-foreground">
          {siteConfig.name} can&apos;t reach the network right now. Cached pages
          may still work. Check your connection and try again.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
