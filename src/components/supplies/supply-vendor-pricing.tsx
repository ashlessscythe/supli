"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
            {vendor.leadTimeDays != null && (
              <span>Lead time: {vendor.leadTimeDays}d</span>
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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<SupplyVendor | null>(null);

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
    setLinkDialogOpen(false);
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
    setEditingVendor(null);
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Vendor links</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Link vendor
        </Button>
      </div>

      {!vendors?.length ? (
        <p className="text-sm text-muted-foreground">
          No vendors linked to this supply.
        </p>
      ) : (
        <div className="space-y-2">
          {vendors.map((vendor) => (
            <VendorLinkRow
              key={vendor.id}
              vendor={vendor}
              supplyId={supplyId}
              onChanged={() => void loadVendors()}
              onEdit={() => setEditingVendor(vendor)}
            />
          ))}
        </div>
      )}

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link vendor</DialogTitle>
          </DialogHeader>
          <ItemVendorLinkForm
            mode="pick-vendor"
            vendorId=""
            supplyId={supplyId}
            excludeIds={linkedVendorIds}
            submitLabel="Link vendor"
            onSubmit={handleLinkVendor}
            onCancel={() => setLinkDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingVendor != null}
        onOpenChange={(open) => {
          if (!open) setEditingVendor(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit link — {editingVendor?.name}
            </DialogTitle>
          </DialogHeader>
          {editingVendor && (
            <ItemVendorLinkForm
              mode="pick-vendor"
              vendorId={editingVendor.id}
              supplyId={supplyId}
              initialData={{
                vendorSku: editingVendor.vendorSku,
                internalSku: editingVendor.internalSku,
                isPreferred: editingVendor.isPreferred,
                leadTimeDays: editingVendor.leadTimeDays,
                moq: editingVendor.moq,
                cost: editingVendor.cost,
              }}
              submitLabel="Save changes"
              onSubmit={handleUpdateLink}
              onCancel={() => setEditingVendor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** @deprecated Use SupplyVendorLinks */
export const SupplyVendorPricing = SupplyVendorLinks;
