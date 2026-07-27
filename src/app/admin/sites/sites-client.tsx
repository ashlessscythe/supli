"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  assignUserToSite,
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

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  role: string;
  siteId: string | null;
  siteName: string | null;
};

export function SitesClient({
  initialSites,
  initialUsers,
  activeSiteId,
}: {
  initialSites: SiteRow[];
  initialUsers: UserRow[];
  activeSiteId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'D',location:'sites-client.tsx:mount',message:'SitesClient mounted',data:{siteCount:initialSites.length,hasActiveSiteId:Boolean(activeSiteId),ua:typeof navigator!=='undefined'?navigator.userAgent:''},timestamp:Date.now()})}).catch(()=>{});
    const onErr = (event: ErrorEvent) => {
      fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'D',location:'sites-client.tsx:window.onerror',message:'client error event',data:{msg:String(event.message||''),file:String(event.filename||'')},timestamp:Date.now()})}).catch(()=>{});
    };
    window.addEventListener('error', onErr);
    return () => window.removeEventListener('error', onErr);
  }, [initialSites.length, activeSiteId]);
  // #endregion
  const [slug, setSlug] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignSiteId, setAssignSiteId] = useState("");
  const [assignRole, setAssignRole] = useState<"ADMIN" | "STAFF" | "PENDING">(
    "STAFF"
  );
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  function refresh() {
    router.refresh();
  }

  function startEdit(site: SiteRow) {
    setError(null);
    setEditingSiteId(site.id);
    setEditName(site.name);
    setEditSlug(site.slug);
  }

  function cancelEdit() {
    setEditingSiteId(null);
    setEditName("");
    setEditSlug("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSiteId) return;
    setError(null);
    const result = await updateSite(editingSiteId, {
      name: editName.trim(),
      slug: editSlug.trim(),
    });
    if (!result.success) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Failed to update site"
      );
      return;
    }
    cancelEdit();
    refresh();
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

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignUserId || !assignSiteId) return;
    setError(null);
    const result = await assignUserToSite(
      assignUserId,
      assignSiteId,
      assignRole
    );
    if (!result.success) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Failed to assign user"
      );
      return;
    }
    refresh();
  }

  const assignableUsers = initialUsers.filter(
    (user) => user.role !== "SUPERADMIN"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sites</h2>
        <p className="text-muted-foreground">
          Manage sites, assign people, and switch the active site
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
          <CardTitle>Assign user to site</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => startTransition(() => void handleAssign(e))}
            className="grid gap-3 sm:grid-cols-4"
          >
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              required
            >
              <option value="">Select user</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                  {user.siteName ? ` (${user.siteName})` : ""}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={assignSiteId}
              onChange={(e) => setAssignSiteId(e.target.value)}
              required
            >
              <option value="">Select site</option>
              {initialSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={assignRole}
              onChange={(e) =>
                setAssignRole(e.target.value as "ADMIN" | "STAFF" | "PENDING")
              }
            >
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="PENDING">Pending</option>
            </select>
            <Button
              type="submit"
              disabled={pending || !assignUserId || !assignSiteId}
            >
              Assign
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
              className="flex flex-col gap-3 border-b py-3 last:border-0"
            >
              {editingSiteId === site.id ? (
                <form
                  onSubmit={(e) =>
                    startTransition(() => void handleSaveEdit(e))
                  }
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    required
                    className="sm:max-w-xs"
                  />
                  <Input
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="slug"
                    required
                    className="sm:max-w-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pending || !editName.trim() || !editSlug.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">
                      {site.name}{" "}
                      <span className="text-muted-foreground">
                        ({site.slug})
                      </span>
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
                      variant="outline"
                      disabled={pending}
                      onClick={() => startEdit(site)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        activeSiteId === site.id ? "secondary" : "default"
                      }
                      disabled={
                        pending || activeSiteId === site.id || !site.isActive
                      }
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
              )}
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
