"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SupplyVendor {
  id: string;
  name: string;
  vendorSku: string | null;
  isPreferred: boolean;
  cost: number | null;
}

interface SupplyVendorPricingProps {
  supplyId: string;
}

function formatCost(value: number | null) {
  return value != null ? value.toString() : "";
}

function VendorCostRow({
  vendor,
  supplyId,
}: {
  vendor: SupplyVendor;
  supplyId: string;
}) {
  const [costInput, setCostInput] = useState(formatCost(vendor.cost));
  const [savedCost, setSavedCost] = useState(vendor.cost);
  const [saving, setSaving] = useState(false);

  const parsedCost = costInput.trim() === "" ? null : Number(costInput);
  const isDirty =
    parsedCost !== savedCost ||
    (costInput.trim() === "" && savedCost != null) ||
    (costInput.trim() !== "" && Number.isNaN(parsedCost));

  const handleSave = async () => {
    if (!isDirty) return;

    if (costInput.trim() !== "" && (Number.isNaN(parsedCost) || parsedCost! < 0)) {
      toast.error("Enter a valid cost (0 or greater), or leave blank to clear.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyId, cost: parsedCost }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to update cost"
        );
      }

      const updated = await res.json();
      const nextCost = updated.cost ?? null;
      setSavedCost(nextCost);
      setCostInput(formatCost(nextCost));
      toast.success(`Updated ${vendor.name} cost`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update cost"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {vendor.name}
          {vendor.isPreferred && (
            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
              Preferred
            </span>
          )}
        </p>
        {vendor.vendorSku && (
          <p className="text-xs text-muted-foreground">SKU: {vendor.vendorSku}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
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
                void handleSave();
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
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function SupplyVendorPricing({ supplyId }: SupplyVendorPricingProps) {
  const [vendors, setVendors] = useState<SupplyVendor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/supplies/${supplyId}/details`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load vendor pricing");
        const data = await res.json();
        if (!cancelled) setVendors(data.vendors ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supplyId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vendor pricing…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!vendors?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No vendors linked to this supply.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Vendor catalog pricing</p>
      <div className="space-y-2">
        {vendors.map((vendor) => (
          <VendorCostRow key={vendor.id} vendor={vendor} supplyId={supplyId} />
        ))}
      </div>
    </div>
  );
}
