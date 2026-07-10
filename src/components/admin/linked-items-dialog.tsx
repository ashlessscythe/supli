"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ItemVendorLinkForm } from "@/components/admin/item-vendor-link-form";

export interface LinkedItem {
  supplyId: string;
  name: string;
  quantity: number;
  minimumThreshold?: number;
  vendorSku?: string | null;
  internalSku?: string | null;
  isPreferred?: boolean;
  leadTimeDays?: number | null;
  moq?: number | null;
  cost?: number | null;
}

interface LinkedItemsDialogProps {
  count: number;
  title: string;
  description?: string;
  fetchUrl: string;
  vendorId?: string;
  onLinksChanged?: (vendorId: string, newCount: number) => void;
}

function formatCost(value: number | null | undefined) {
  return value != null ? value.toString() : "";
}

function LinkedItemRow({
  item,
  vendorId,
  onCostSaved,
  onEdit,
  onUnlinked,
}: {
  item: LinkedItem;
  vendorId?: string;
  onCostSaved: (supplyId: string, cost: number | null) => void;
  onEdit: () => void;
  onUnlinked: () => void;
}) {
  const [costInput, setCostInput] = useState(formatCost(item.cost));
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isLow =
    item.minimumThreshold !== undefined &&
    item.quantity <= item.minimumThreshold;

  const parsedCost = costInput.trim() === "" ? null : Number(costInput);
  const currentCost = item.cost ?? null;
  const isDirty =
    vendorId != null &&
    (parsedCost !== currentCost ||
      (costInput.trim() === "" && currentCost != null) ||
      (costInput.trim() !== "" && Number.isNaN(parsedCost)));

  const handleSaveCost = async () => {
    if (!vendorId || !isDirty) return;

    if (
      costInput.trim() !== "" &&
      (Number.isNaN(parsedCost) || parsedCost! < 0)
    ) {
      toast.error("Enter a valid cost (0 or greater), or leave blank to clear.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyId: item.supplyId, cost: parsedCost }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to update cost"
        );
      }

      const updated = await res.json();
      onCostSaved(item.supplyId, updated.cost ?? null);
      setCostInput(formatCost(updated.cost));
      toast.success(`Updated cost for ${item.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update cost"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!vendorId) return;

    setRemoving(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyId: item.supplyId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to unlink"
        );
      }

      toast.success(`Unlinked ${item.name}`);
      onUnlinked();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unlink"
      );
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  return (
    <li className="flex items-start justify-between gap-3 px-1 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={`/admin/supplies?q=${encodeURIComponent(item.name)}`}
            className="group inline-flex items-center gap-2 font-medium hover:underline"
          >
            <span className="truncate">{item.name}</span>
            {item.isPreferred && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                Preferred
              </span>
            )}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          {vendorId && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {confirmRemove ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={removing}
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7"
                    disabled={removing}
                    onClick={() => void handleUnlink()}
                  >
                    {removing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Unlink"
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => setConfirmRemove(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {item.vendorSku && <span>Vendor SKU: {item.vendorSku}</span>}
          {item.internalSku && <span>Internal SKU: {item.internalSku}</span>}
          {item.leadTimeDays != null && (
            <span>Lead time: {item.leadTimeDays}d</span>
          )}
          {item.moq != null && <span>MOQ: {item.moq}</span>}
        </div>
        {vendorId ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Unit cost</span>
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveCost();
                  }
                }}
                className="h-8 pl-5 text-sm"
                placeholder="—"
                disabled={saving}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!isDirty || saving}
              onClick={() => void handleSaveCost()}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        ) : (
          item.cost != null && (
            <p className="text-xs text-muted-foreground">
              ${item.cost.toFixed(2)}
            </p>
          )
        )}
      </div>
      <span
        className={cn(
          "whitespace-nowrap text-sm tabular-nums",
          isLow && "text-red-500"
        )}
      >
        Qty: {item.quantity}
      </span>
    </li>
  );
}

export function LinkedItemsDialog({
  count,
  title,
  description,
  fetchUrl,
  vendorId,
  onLinksChanged,
}: LinkedItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LinkedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkedItem | null>(null);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    setDisplayCount(count);
  }, [count]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Failed to load items");
      const data = await res.json();
      setItems(data);
      setDisplayCount(data.length);
      if (vendorId && onLinksChanged) {
        onLinksChanged(vendorId, data.length);
      }
    } catch {
      setError("Could not load linked items.");
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, vendorId, onLinksChanged]);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) {
      await loadItems();
    }
  };

  const handleCostSaved = (supplyId: string, cost: number | null) => {
    setItems(
      (prev) =>
        prev?.map((item) =>
          item.supplyId === supplyId ? { ...item, cost } : item
        ) ?? null
    );
  };

  const handleLinkSupply = async (values: {
    vendorId: string;
    supplyId: string;
    vendorSku?: string;
    internalSku?: string;
    isPreferred: boolean;
    leadTimeDays?: number;
    moq?: number;
    cost?: number;
  }) => {
    const res = await fetch(`/api/vendors/${values.vendorId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplyId: values.supplyId,
        vendorSku: values.vendorSku,
        internalSku: values.internalSku,
        isPreferred: values.isPreferred,
        leadTimeDays: values.leadTimeDays,
        moq: values.moq,
        cost: values.cost,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        typeof body.error === "string" ? body.error : "Failed to link supply"
      );
    }

    toast.success("Supply linked");
    setLinkDialogOpen(false);
    await loadItems();
  };

  const handleUpdateLink = async (values: {
    vendorId: string;
    supplyId: string;
    vendorSku?: string;
    internalSku?: string;
    isPreferred: boolean;
    leadTimeDays?: number;
    moq?: number;
    cost?: number;
  }) => {
    const res = await fetch(`/api/vendors/${values.vendorId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplyId: values.supplyId,
        vendorSku: values.vendorSku ?? null,
        internalSku: values.internalSku ?? null,
        isPreferred: values.isPreferred,
        leadTimeDays: values.leadTimeDays ?? null,
        moq: values.moq ?? null,
        cost: values.cost ?? null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        typeof body.error === "string" ? body.error : "Failed to update link"
      );
    }

    toast.success("Link updated");
    setEditingItem(null);
    await loadItems();
  };

  const linkedSupplyIds = items?.map((item) => item.supplyId) ?? [];

  const triggerLabel =
    displayCount === 0
      ? "0 items · Link"
      : `${displayCount} ${displayCount === 1 ? "item" : "items"}`;

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpenChange(true)}
        className="font-medium text-primary hover:underline"
      >
        {triggerLabel}
      </button>

      <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          {vendorId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setLinkDialogOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Link supply
            </Button>
          )}

          <div className="max-h-[50vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </div>
            )}

            {error && (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && items && items.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No linked items yet.
              </div>
            )}

            {!loading && !error && items && items.length > 0 && (
              <ul className="divide-y">
                {items.map((item) => (
                  <LinkedItemRow
                    key={item.supplyId}
                    item={item}
                    vendorId={vendorId}
                    onCostSaved={handleCostSaved}
                    onEdit={() => setEditingItem(item)}
                    onUnlinked={() => void loadItems()}
                  />
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {vendorId && (
        <>
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Link supply</DialogTitle>
              </DialogHeader>
              <ItemVendorLinkForm
                mode="pick-supply"
                vendorId={vendorId}
                excludeIds={linkedSupplyIds}
                submitLabel="Link supply"
                onSubmit={handleLinkSupply}
                onCancel={() => setLinkDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={editingItem != null}
            onOpenChange={(open) => {
              if (!open) setEditingItem(null);
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit link — {editingItem?.name}</DialogTitle>
              </DialogHeader>
              {editingItem && (
                <ItemVendorLinkForm
                  mode="pick-supply"
                  vendorId={vendorId}
                  supplyId={editingItem.supplyId}
                  initialData={{
                    vendorSku: editingItem.vendorSku,
                    internalSku: editingItem.internalSku,
                    isPreferred: editingItem.isPreferred,
                    leadTimeDays: editingItem.leadTimeDays,
                    moq: editingItem.moq,
                    cost: editingItem.cost,
                  }}
                  submitLabel="Save changes"
                  onSubmit={handleUpdateLink}
                  onCancel={() => setEditingItem(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
