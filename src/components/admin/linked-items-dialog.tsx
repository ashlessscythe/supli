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
import {
  buildLeadTimePatch,
  parseLeadTimeDaysInput,
} from "@/lib/vendor-link";

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

type PanelMode =
  | { type: "list" }
  | { type: "link" }
  | { type: "edit"; item: LinkedItem };

function formatCost(value: number | null | undefined) {
  return value != null ? value.toString() : "";
}

function LinkedItemRow({
  item,
  vendorId,
  onCostSaved,
  onLeadTimeSaved,
  onEdit,
  onUnlinked,
}: {
  item: LinkedItem;
  vendorId?: string;
  onCostSaved: (supplyId: string, cost: number | null) => void;
  onLeadTimeSaved: (supplyId: string, leadTimeDays: number | null) => void;
  onEdit: () => void;
  onUnlinked: () => void;
}) {
  const [costInput, setCostInput] = useState(formatCost(item.cost));
  const [leadInput, setLeadInput] = useState(
    item.leadTimeDays != null ? String(item.leadTimeDays) : ""
  );
  const [savingCost, setSavingCost] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isLow =
    item.minimumThreshold !== undefined &&
    item.quantity <= item.minimumThreshold;

  const parsedCost = costInput.trim() === "" ? null : Number(costInput);
  const currentCost = item.cost ?? null;
  const costDirty =
    vendorId != null &&
    (parsedCost !== currentCost ||
      (costInput.trim() === "" && currentCost != null) ||
      (costInput.trim() !== "" && Number.isNaN(parsedCost)));

  const parsedLead = leadInput.trim() === "" ? null : Number(leadInput);
  const currentLead = item.leadTimeDays ?? null;
  const leadDirty =
    vendorId != null &&
    (parsedLead !== currentLead ||
      (leadInput.trim() === "" && currentLead != null) ||
      (leadInput.trim() !== "" &&
        (Number.isNaN(parsedLead) ||
          !Number.isInteger(parsedLead) ||
          parsedLead! <= 0)));

  const handleSaveCost = async () => {
    if (!vendorId || !costDirty) return;

    if (
      costInput.trim() !== "" &&
      (Number.isNaN(parsedCost) || parsedCost! < 0)
    ) {
      toast.error("Enter a valid cost (0 or greater), or leave blank to clear.");
      return;
    }

    setSavingCost(true);
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
      setSavingCost(false);
    }
  };

  const handleSaveLeadTime = async () => {
    if (!vendorId || !leadDirty) return;

    const parsedResult = parseLeadTimeDaysInput(leadInput);
    if (!parsedResult.ok) {
      toast.error(parsedResult.error);
      return;
    }

    setSavingLead(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildLeadTimePatch(item.supplyId, parsedResult.value)
        ),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Failed to update lead time"
        );
      }

      const updated = await res.json();
      const next = updated.leadTimeDays ?? null;
      onLeadTimeSaved(item.supplyId, next);
      setLeadInput(next != null ? String(next) : "");
      toast.success(`Updated lead time for ${item.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update lead time"
      );
    } finally {
      setSavingLead(false);
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
    <li className="min-w-0 space-y-2 px-1 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/admin/supplies?q=${encodeURIComponent(item.name)}`}
              className="group inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium hover:underline"
            >
              <span className="truncate">{item.name}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            {item.isPreferred && (
              <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                Preferred
              </span>
            )}
            <span
              className={cn(
                "shrink-0 text-sm tabular-nums text-muted-foreground",
                isLow && "text-red-500"
              )}
            >
              Qty: {item.quantity}
            </span>
            {vendorId && (
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={onEdit}
                  aria-label={`Edit link for ${item.name}`}
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
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {item.vendorSku && <span>Vendor SKU: {item.vendorSku}</span>}
        {item.internalSku && <span>Internal SKU: {item.internalSku}</span>}
        {item.moq != null && <span>MOQ: {item.moq}</span>}
      </div>
      {vendorId ? (
        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              Lead days
            </span>
            <Input
              type="number"
              min={1}
              step={1}
              value={leadInput}
              onChange={(e) => setLeadInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSaveLeadTime();
                }
              }}
              className="h-8 w-28 min-w-0 text-sm"
              placeholder="—"
              disabled={savingLead}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!leadDirty || savingLead}
              onClick={() => void handleSaveLeadTime()}
            >
              {savingLead ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              Cost
            </span>
            <div className="relative w-28 min-w-0">
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
                disabled={savingCost}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!costDirty || savingCost}
              onClick={() => void handleSaveCost()}
            >
              {savingCost ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {item.leadTimeDays != null && (
            <p>Lead time: {item.leadTimeDays}d</p>
          )}
          {item.cost != null && <p>${item.cost.toFixed(2)}</p>}
        </div>
      )}
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
  const [panel, setPanel] = useState<PanelMode>({ type: "list" });
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
      setPanel({ type: "list" });
      await loadItems();
    } else {
      setPanel({ type: "list" });
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

  const handleLeadTimeSaved = (
    supplyId: string,
    leadTimeDays: number | null
  ) => {
    setItems(
      (prev) =>
        prev?.map((item) =>
          item.supplyId === supplyId ? { ...item, leadTimeDays } : item
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
    setPanel({ type: "list" });
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
    setPanel({ type: "list" });
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
        <DialogContent className="flex max-h-[min(90dvh,calc(100dvh-2rem))] w-[calc(100%-1.5rem)] min-w-0 max-w-2xl flex-col gap-4 overflow-x-hidden overflow-y-hidden sm:max-w-2xl">
          {panel.type === "link" && vendorId ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <DialogHeader>
                <DialogTitle>Link supply</DialogTitle>
                <DialogDescription>
                  Set SKU, lead time, MOQ, and cost for this vendor link.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <ItemVendorLinkForm
                  mode="pick-supply"
                  vendorId={vendorId}
                  excludeIds={linkedSupplyIds}
                  submitLabel="Link supply"
                  onSubmit={handleLinkSupply}
                  onCancel={() => setPanel({ type: "list" })}
                />
              </div>
            </div>
          ) : panel.type === "edit" && vendorId ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <DialogHeader>
                <DialogTitle>Edit link — {panel.item.name}</DialogTitle>
                <DialogDescription>
                  Update lead time, MOQ, cost, and SKUs for this supply–vendor
                  link.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <ItemVendorLinkForm
                  key={panel.item.supplyId}
                  mode="pick-supply"
                  vendorId={vendorId}
                  supplyId={panel.item.supplyId}
                  initialData={{
                    vendorSku: panel.item.vendorSku,
                    internalSku: panel.item.internalSku,
                    isPreferred: panel.item.isPreferred,
                    leadTimeDays: panel.item.leadTimeDays,
                    moq: panel.item.moq,
                    cost: panel.item.cost,
                  }}
                  submitLabel="Save changes"
                  onSubmit={handleUpdateLink}
                  onCancel={() => setPanel({ type: "list" })}
                />
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="shrink-0">
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
                  className="w-fit shrink-0"
                  onClick={() => setPanel({ type: "link" })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Link supply
                </Button>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                    {vendorId &&
                      " Link a supply to set lead time, MOQ, and cost."}
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
                        onLeadTimeSaved={handleLeadTimeSaved}
                        onEdit={() => setPanel({ type: "edit", item })}
                        onUnlinked={() => void loadItems()}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
