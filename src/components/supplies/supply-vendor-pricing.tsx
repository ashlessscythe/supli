"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemVendorLinkForm } from "@/components/admin/item-vendor-link-form";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SupplyVendor {
  id: string;
  name: string;
  vendorSku: string | null;
  internalSku: string | null;
  isPreferred: boolean;
  leadTimeDays: number | null;
  moq: number | null;
  cost: number | null;
}

interface SupplyVendorLinksProps {
  supplyId: string;
}

type PanelMode =
  | { type: "list" }
  | { type: "link" }
  | { type: "edit"; vendor: SupplyVendor };

function formatCost(value: number | null) {
  return value != null ? value.toString() : "";
}

function VendorCostRow({
  vendor,
  supplyId,
  onUpdated,
}: {
  vendor: SupplyVendor;
  supplyId: string;
  onUpdated: (vendorId: string, cost: number | null) => void;
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

    if (
      costInput.trim() !== "" &&
      (Number.isNaN(parsedCost) || parsedCost! < 0)
    ) {
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
      onUpdated(vendor.id, nextCost);
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
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">Cost</span>
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
  );
}

function VendorLeadTimeRow({
  vendor,
  supplyId,
  onUpdated,
}: {
  vendor: SupplyVendor;
  supplyId: string;
  onUpdated: (vendorId: string, leadTimeDays: number | null) => void;
}) {
  const [input, setInput] = useState(
    vendor.leadTimeDays != null ? String(vendor.leadTimeDays) : ""
  );
  const [saved, setSaved] = useState(vendor.leadTimeDays);
  const [saving, setSaving] = useState(false);

  const parsed = input.trim() === "" ? null : Number(input);
  const isDirty =
    parsed !== saved ||
    (input.trim() === "" && saved != null) ||
    (input.trim() !== "" && (Number.isNaN(parsed) || parsed! <= 0));

  const handleSave = async () => {
    if (!isDirty) return;

    if (
      input.trim() !== "" &&
      (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed! <= 0)
    ) {
      toast.error("Enter a whole number of days (1+), or leave blank to clear.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyId, leadTimeDays: parsed }),
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
      setSaved(next);
      setInput(next != null ? String(next) : "");
      onUpdated(vendor.id, next);
      toast.success(`Updated ${vendor.name} lead time`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update lead time"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">
        Lead days
      </span>
      <Input
        type="number"
        min={1}
        step={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleSave();
          }
        }}
        className="h-8 w-28 text-sm"
        placeholder="—"
        disabled={saving}
      />
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
  );
}

function VendorLinkRow({
  vendor,
  supplyId,
  onChanged,
  onEdit,
}: {
  vendor: SupplyVendor;
  supplyId: string;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [localCost, setLocalCost] = useState(vendor.cost);
  const [localLeadTime, setLocalLeadTime] = useState(vendor.leadTimeDays);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to remove link"
        );
      }

      toast.success(`Removed ${vendor.name}`);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove link"
      );
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {vendor.name}
            {vendor.isPreferred && (
              <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                Preferred
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {vendor.vendorSku && <span>Vendor SKU: {vendor.vendorSku}</span>}
            {vendor.internalSku && (
              <span>Internal SKU: {vendor.internalSku}</span>
            )}
            {localLeadTime != null && (
              <span>Lead time: {localLeadTime}d</span>
            )}
            {vendor.moq != null && <span>MOQ: {vendor.moq}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onEdit}
            aria-label={`Edit ${vendor.name} link`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {confirmRemove ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={removing}
                onClick={() => setConfirmRemove(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8"
                disabled={removing}
                onClick={() => void handleRemove()}
              >
                {removing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Remove"
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-destructive hover:text-destructive"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <VendorLeadTimeRow
        vendor={{ ...vendor, leadTimeDays: localLeadTime }}
        supplyId={supplyId}
        onUpdated={(_, leadTimeDays) => setLocalLeadTime(leadTimeDays)}
      />
      <VendorCostRow
        vendor={{ ...vendor, cost: localCost }}
        supplyId={supplyId}
        onUpdated={(_, cost) => setLocalCost(cost)}
      />
    </div>
  );
}

export function SupplyVendorLinks({ supplyId }: SupplyVendorLinksProps) {
  const [vendors, setVendors] = useState<SupplyVendor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelMode>({ type: "list" });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/supplies/${supplyId}/details`);
      if (!res.ok) throw new Error("Failed to load vendor links");
      const data = await res.json();
      setVendors(data.vendors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [supplyId]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const handleLinkVendor = async (values: {
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
        typeof body.error === "string" ? body.error : "Failed to link vendor"
      );
    }

    toast.success("Vendor linked");
    setPanel({ type: "list" });
    await loadVendors();
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

    toast.success("Vendor link updated");
    setPanel({ type: "list" });
    await loadVendors();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vendor links…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const linkedVendorIds = vendors?.map((v) => v.id) ?? [];

  if (panel.type === "link") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Link vendor</p>
        <ItemVendorLinkForm
          mode="pick-vendor"
          vendorId=""
          supplyId={supplyId}
          excludeIds={linkedVendorIds}
          submitLabel="Link vendor"
          onSubmit={handleLinkVendor}
          onCancel={() => setPanel({ type: "list" })}
        />
      </div>
    );
  }

  if (panel.type === "edit") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">
          Edit link — {panel.vendor.name}
        </p>
        <ItemVendorLinkForm
          key={panel.vendor.id}
          mode="pick-vendor"
          vendorId={panel.vendor.id}
          supplyId={supplyId}
          initialData={{
            vendorSku: panel.vendor.vendorSku,
            internalSku: panel.vendor.internalSku,
            isPreferred: panel.vendor.isPreferred,
            leadTimeDays: panel.vendor.leadTimeDays,
            moq: panel.vendor.moq,
            cost: panel.vendor.cost,
          }}
          submitLabel="Save changes"
          onSubmit={handleUpdateLink}
          onCancel={() => setPanel({ type: "list" })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Vendor links</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setPanel({ type: "link" })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Link vendor
        </Button>
      </div>

      {!vendors?.length ? (
        <p className="text-sm text-muted-foreground">
          No vendors linked to this supply. Link a vendor to set lead time,
          MOQ, and cost.
        </p>
      ) : (
        <div className="space-y-2">
          {vendors.map((vendor) => (
            <VendorLinkRow
              key={vendor.id}
              vendor={vendor}
              supplyId={supplyId}
              onChanged={() => void loadVendors()}
              onEdit={() => setPanel({ type: "edit", vendor })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** @deprecated Use SupplyVendorLinks */
export const SupplyVendorPricing = SupplyVendorLinks;
