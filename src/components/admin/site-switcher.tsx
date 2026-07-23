"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchActiveSite } from "@/lib/actions/site";

type SiteOption = { id: string; name: string; slug: string };

export function SiteSwitcher({
  sites,
  activeSiteId,
}: {
  sites: SiteOption[];
  activeSiteId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (sites.length === 0) return null;

  return (
    <div className="mb-4 space-y-1 px-1">
      <p className="text-xs font-medium text-muted-foreground">Active site</p>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={activeSiteId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const siteId = e.target.value;
          if (!siteId) return;
          startTransition(async () => {
            await switchActiveSite(siteId);
            router.refresh();
          });
        }}
      >
        <option value="" disabled>
          Select a site
        </option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </div>
  );
}
