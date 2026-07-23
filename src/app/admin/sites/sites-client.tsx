"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createSite,
  deleteSite,
  switchActiveSite,
  updateSite,
} from "@/lib/actions/site";

type SiteRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: {
    users: number;
    supplies: number;
    locations: number;
    vendors: number;
  };
};

export function SitesClient({
  initialSites,
  activeSiteId,
}: {
  initialSites: SiteRow[];
  activeSiteId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function refresh() {
    router.refresh();
  }

  async function handleSwitch(siteId: string) {
    setError(null);
    const result = await switchActiveSite(siteId);
    if (!result.success) {
      setError(
        typeof result.error === "string" ? result.error : "Failed to switch site"
      );
      return;
    }
    refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createSite({ name, slug });
    if (!result.success) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Failed to create site"
      );
      return;
    }
    setName("");
    setSlug("");
    refresh();
  }

  async function handleToggleActive(site: SiteRow) {
    setError(null);
    const result = await updateSite(site.id, { isActive: !site.isActive });
    if (!result.success) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Failed to update site"
      );
      return;
    }
    refresh();
  }

  async function handleDelete(siteId: string) {
    setError(null);
    const result = await deleteSite(siteId);
    if (!result.success) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Failed to delete site"
      );
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sites</h2>
        <p className="text-muted-foreground">
          Manage sites and switch the active site for administration
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create site</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => startTransition(() => void handleCreate(e))}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <Button type="submit" disabled={pending || !name || !slug}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All sites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialSites.map((site) => (
            <div
              key={site.id}
              className="flex flex-col gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium">
                  {site.name}{" "}
                  <span className="text-muted-foreground">({site.slug})</span>
                  {activeSiteId === site.id && (
                    <span className="ml-2 text-xs text-primary">Active</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {site.isActive ? "Active" : "Inactive"} ·{" "}
                  {site._count.users} users · {site._count.supplies} supplies
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={activeSiteId === site.id ? "secondary" : "default"}
                  disabled={pending || activeSiteId === site.id || !site.isActive}
                  onClick={() =>
                    startTransition(() => void handleSwitch(site.id))
                  }
                >
                  {activeSiteId === site.id ? "Selected" : "Switch"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => void handleToggleActive(site))
                  }
                >
                  {site.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => void handleDelete(site.id))
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {initialSites.length === 0 && (
            <p className="text-sm text-muted-foreground">No sites yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
