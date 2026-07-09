"use client";

import { useState } from "react";
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
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface LinkedItem {
  supplyId: string;
  name: string;
  quantity: number;
  minimumThreshold?: number;
  vendorSku?: string | null;
  isPreferred?: boolean;
  cost?: number | null;
}

interface LinkedItemsDialogProps {
  count: number;
  title: string;
  description?: string;
  fetchUrl: string;
  /** When set, catalog unit cost can be edited inline. */
  vendorId?: string;
}

function formatCost(value: number | null | undefined) {
  return value != null ? value.toString() : "";
}

function LinkedItemRow({
  item,
  vendorId,
  onCostSaved,
}: {
  item: LinkedItem;
  vendorId?: string;
  onCostSaved: (supplyId: string, cost: number | null) => void;
}) {
  const [costInput, setCostInput] = useState(formatCost(item.cost));
  const [saving, setSaving] = useState(false);

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

    if (costInput.trim() !== "" && (Number.isNaN(parsedCost) || parsedCost! < 0)) {
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

  return (
    <li className="flex items-start justify-between gap-3 px-1 py-3">
      <div className="min-w-0 flex-1">
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
        {item.vendorSku && (
          <p className="text-xs text-muted-foreground">SKU: {item.vendorSku}</p>
        )}
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
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
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
        className={cn("whitespace-nowrap text-sm tabular-nums", isLow && "text-red-500")}
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
}: LinkedItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LinkedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) {
    return <span className="text-muted-foreground">0</span>;
  }

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && items === null && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error("Failed to load items");
        setItems(await res.json());
      } catch {
        setError("Could not load linked items.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCostSaved = (supplyId: string, cost: number | null) => {
    setItems((prev) =>
      prev?.map((item) =>
        item.supplyId === supplyId ? { ...item, cost } : item
      ) ?? null
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="font-medium text-primary hover:underline"
      >
        {count} {count === 1 ? "item" : "items"}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
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
                No linked items.
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
                  />
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
