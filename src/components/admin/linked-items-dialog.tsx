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
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";

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
}

export function LinkedItemsDialog({
  count,
  title,
  description,
  fetchUrl,
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
        <DialogContent className="max-h-[80vh] overflow-hidden">
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
                {items.map((item) => {
                  const isLow =
                    item.minimumThreshold !== undefined &&
                    item.quantity <= item.minimumThreshold;
                  return (
                    <li key={item.supplyId}>
                      <Link
                        href={`/dashboard/supplies?q=${encodeURIComponent(
                          item.name
                        )}`}
                        className="group flex items-center justify-between gap-3 px-1 py-3 hover:bg-accent/50 rounded-sm"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className="truncate">{item.name}</span>
                            {item.isPreferred && (
                              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                                Preferred
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.vendorSku
                              ? `SKU: ${item.vendorSku}`
                              : null}
                            {item.cost != null
                              ? `${item.vendorSku ? " · " : ""}$${item.cost.toFixed(
                                  2
                                )}`
                              : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 whitespace-nowrap text-sm">
                          <span
                            className={cn(
                              "tabular-nums",
                              isLow && "text-red-500"
                            )}
                          >
                            Qty: {item.quantity}
                          </span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
