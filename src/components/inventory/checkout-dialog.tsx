"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeBarcode, formatBarcode } from "@/lib/barcode";
import { useStockMovements } from "@/hooks/use-stock-movements";
import { CheckCircle2, Minus, Plus, Scan, ShoppingCart, Trash2 } from "lucide-react";
import { Supply } from "@/types";

interface CartItem {
  supplyId: string;
  name: string;
  quantity: number;
  available: number;
}

interface CheckoutDialogProps {
  supplies: Supply[];
  trigger?: React.ReactNode;
}

export function CheckoutDialog({ supplies, trigger }: CheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [searchSupplyId, setSearchSupplyId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[] | null>(null);
  const { handleCheckout, isLoading } = useStockMovements();
  const scanRef = useRef<HTMLInputElement>(null);

  const barcodeMap = useMemo(() => {
    const map = new Map<string, Supply>();
    for (const supply of supplies) {
      if (supply.barcode) {
        map.set(normalizeBarcode(supply.barcode), supply);
      }
    }
    return map;
  }, [supplies]);

  useEffect(() => {
    if (open) {
      scanRef.current?.focus();
    }
  }, [open]);

  function resetForm() {
    setBarcode("");
    setSearchSupplyId("");
    setCart([]);
    setNotes("");
    setError(null);
    setCompleted(null);
  }

  function addToCart(supply: Supply) {
    setError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.supplyId === supply.id);
      if (existing) {
        return prev.map((item) =>
          item.supplyId === supply.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          supplyId: supply.id,
          name: supply.name,
          quantity: 1,
          available: supply.quantity,
        },
      ];
    });
  }

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeBarcode(barcode);
    if (!normalized) return;

    const supply = barcodeMap.get(normalized);
    if (!supply) {
      setError(`No item found for barcode ${formatBarcode(barcode)}`);
      return;
    }

    addToCart(supply);
    setBarcode("");
    scanRef.current?.focus();
  }

  function handleSearchAdd() {
    if (!searchSupplyId) return;
    const supply = supplies.find((s) => s.id === searchSupplyId);
    if (!supply) return;
    addToCart(supply);
    setSearchSupplyId("");
  }

  function updateQuantity(supplyId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.supplyId === supplyId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(supplyId: string) {
    setCart((prev) => prev.filter((item) => item.supplyId !== supplyId));
  }

  async function handleComplete() {
    if (cart.length === 0) {
      setError("Add at least one item to check out");
      return;
    }

    setError(null);
    const success = await handleCheckout({
      items: cart.map((item) => ({
        supplyId: item.supplyId,
        quantity: item.quantity,
      })),
      notes: notes.trim() || undefined,
    });

    if (success) {
      setCompleted(cart.map((item) => `${item.quantity}× ${item.name}`));
      setCart([]);
      setNotes("");
      setBarcode("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Check Out
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Check Out Supplies</DialogTitle>
        </DialogHeader>

        {completed ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="font-medium">Checkout complete</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {completed.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleScanSubmit} className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Scan className="h-4 w-4" />
                <span>Scan or enter barcode</span>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={scanRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode..."
                  autoComplete="off"
                />
                <Button type="submit" disabled={!barcode.trim()}>
                  Add
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or search by name</p>
              <div className="flex gap-2">
                <Select value={searchSupplyId} onValueChange={setSearchSupplyId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select supply..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((supply) => (
                      <SelectItem key={supply.id} value={supply.id}>
                        {supply.name} ({supply.quantity} on hand)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchAdd}
                  disabled={!searchSupplyId}
                >
                  Add
                </Button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Cart ({cart.length})</p>
                <ul className="space-y-2">
                  {cart.map((item) => (
                    <li
                      key={item.supplyId}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.available} available
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.supplyId, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.supplyId, 1)}
                          disabled={item.quantity >= item.available}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => removeItem(item.supplyId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Textarea
              rows={2}
              placeholder="Optional notes (e.g. Line 3 maintenance)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleComplete}
                disabled={isLoading || cart.length === 0}
              >
                {isLoading ? "Processing..." : "Complete checkout"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
