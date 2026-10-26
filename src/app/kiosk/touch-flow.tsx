"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useKioskIdleReset } from "@/hooks/use-kiosk-idle-reset";
import {
  cartTotals,
  emptyKioskCart,
  kioskCartReducer,
  qtyInCart,
} from "@/lib/kiosk-cart";
import { filterKioskSupplies } from "@/lib/kiosk-touch-filter";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import { haptic } from "@/lib/haptics";
import { KIOSK_DONE_SCREEN_MS } from "@/lib/kiosk-constants";
import { cn } from "@/lib/utils";
import { IdleWarning } from "./idle-warning";
import { KioskCart } from "./kiosk-cart";
import { SupplyTile } from "./supply-tile";
import { QuantityStepper } from "./quantity-stepper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CatalogCategory = { id: string; name: string };
type CatalogSupply = {
  id: string;
  name: string;
  barcode: string | null;
  internalSku: string | null;
  onHand: number;
  itemTypeId: string | null;
  usageScore: number;
};

type KioskTouchFlowProps = {
  siteName: string;
  onBack: () => void;
  onDone: () => void;
  onSwitchToScan: () => void;
};

export function KioskTouchFlow({
  siteName,
  onBack,
  onDone,
  onSwitchToScan,
}: KioskTouchFlowProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offlineCatalog, setOfflineCatalog] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [supplies, setSupplies] = useState<CatalogSupply[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cart, dispatch] = useReducer(kioskCartReducer, undefined, emptyKioskCart);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [stepperSupplyId, setStepperSupplyId] = useState<string | null>(null);
  const [narrowPortrait, setNarrowPortrait] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setOfflineCatalog(false);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOfflineCatalog(true);
        setLoadError("Touch mode needs a connection. Use SCAN");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/kiosk/supplies");
      if (!res.ok) {
        setLoadError("Could not load supplies");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        categories: CatalogCategory[];
        supplies: CatalogSupply[];
      };
      setCategories(data.categories ?? []);
      setSupplies(data.supplies ?? []);
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOfflineCatalog(true);
        setLoadError("Touch mode needs a connection. Use SCAN");
      } else {
        setLoadError("Could not load supplies");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(
      "(max-width: 400px) and (orientation: portrait)"
    );
    const update = () => setNarrowPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const idle = useKioskIdleReset(doneCount == null, () => {
    dispatch({ type: "clear" });
    onBack();
  });

  const filtered = useMemo(
    () => filterKioskSupplies(supplies, { categoryId, query }),
    [supplies, categoryId, query]
  );

  const useCategorySelect = narrowPortrait && categories.length > 8;
  const { itemCount } = cartTotals(cart);
  const stepperLine = stepperSupplyId
    ? cart.lines.find((l) => l.supplyId === stepperSupplyId)
    : null;
  const stepperSupply = stepperSupplyId
    ? supplies.find((s) => s.id === stepperSupplyId)
    : null;

  function finishDone(count: number, offline: boolean) {
    setSubmitting(false);
    haptic(offline ? [12, 40, 12] : [10, 30, 10]);
    setDoneCount(count);
    if (offline) {
      toast.message("Saved offline — will sync when you’re back online");
    }
    setTimeout(() => {
      dispatch({ type: "clear" });
      onDone();
    }, KIOSK_DONE_SCREEN_MS);
  }

  async function handleCheckout() {
    if (submitting || cart.lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    const items = cart.lines
      .filter((l) => !l.missing && l.quantity > 0)
      .map((l) => ({ supplyId: l.supplyId, quantity: l.quantity }));
    const clientCheckoutId = crypto.randomUUID();
    const payload = JSON.stringify({ items, clientCheckoutId });
    const unitCount = items.reduce((s, i) => s + i.quantity, 0);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation({
        url: "/api/kiosk/checkout",
        method: "POST",
        body: payload,
        label: `Checkout ${items.length} items`,
      });
      finishDone(unitCount, true);
      return;
    }

    try {
      const res = await fetch("/api/kiosk/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: { id: string; name: string; quantity: number }[];
        insufficient?: { supplyId: string; name: string; available: number }[];
        missing?: string[];
      };

      if (res.status === 409 && data.insufficient) {
        dispatch({
          type: "applyServerErrors",
          insufficient: data.insufficient,
        });
        setError(
          typeof data.error === "string"
            ? data.error
            : "Some items don’t have enough stock"
        );
        haptic(30);
        toast.error("Not enough stock — adjust quantities");
        setSubmitting(false);
        return;
      }

      if (res.status === 404 && data.missing) {
        dispatch({ type: "applyServerErrors", missing: data.missing });
        setError("Some items are no longer available — remove them");
        haptic(30);
        void fetchCatalog();
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Checkout failed — try again"
        );
        haptic(30);
        setSubmitting(false);
        return;
      }

      finishDone(unitCount, false);
    } catch {
      enqueueOfflineMutation({
        url: "/api/kiosk/checkout",
        method: "POST",
        body: payload,
        label: `Checkout ${items.length} items`,
      });
      finishDone(unitCount, true);
    }
  }

  if (doneCount != null) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <p className="text-2xl font-semibold">Done!</p>
        <p className="text-muted-foreground">
          Recorded {doneCount} items
        </p>
      </div>
    );
  }

  if (offlineCatalog || (loadError && !loading && supplies.length === 0)) {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-6 p-6 text-center">
        <p className="text-lg">{loadError}</p>
        <div className="flex w-full flex-col gap-3">
          <Button
            type="button"
            className="h-14 text-lg"
            onClick={onSwitchToScan}
          >
            Use SCAN
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={() => void fetchCatalog()}
          >
            Retry
          </Button>
          <Button type="button" variant="ghost" className="h-12" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
      {idle.showWarning && (
        <IdleWarning
          secondsRemaining={idle.secondsRemaining}
          onKeepGoing={idle.keepGoing}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 shrink-0 border-b bg-background/95 px-3 pb-3 pt-2 backdrop-blur safe-pad">
            <div className="mb-2 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-12 shrink-0 touch-manipulation"
                onClick={onBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="truncate text-lg font-semibold">{siteName}</h1>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search supplies"
                className="h-12 pl-9 pr-10"
                autoComplete="off"
                aria-label="Search supplies"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-2">
              {useCategorySelect ? (
                <Select
                  value={categoryId ?? "all"}
                  onValueChange={(v) =>
                    setCategoryId(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Category: All</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div
                  className={cn(
                    "flex gap-2 overflow-x-auto snap-x pb-1",
                    "lg:flex-wrap lg:overflow-visible"
                  )}
                >
                  <Button
                    type="button"
                    variant={categoryId == null ? "default" : "outline"}
                    className="h-11 shrink-0 snap-start px-4 touch-manipulation"
                    onClick={() => setCategoryId(null)}
                  >
                    All
                  </Button>
                  {categories.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={categoryId === c.id ? "default" : "outline"}
                      className="h-11 shrink-0 snap-start px-4 touch-manipulation"
                      onClick={() => setCategoryId(c.id)}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div
            className={cn(
              "flex-1 overflow-y-auto p-3",
              itemCount > 0 && "pb-24 md:landscape:pb-3"
            )}
          >
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:landscape:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="min-h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:landscape:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((s) => (
                  <SupplyTile
                    key={s.id}
                    name={s.name}
                    onHand={s.onHand}
                    inCart={qtyInCart(cart, s.id)}
                    onAdd={() =>
                      dispatch({
                        type: "add",
                        supplyId: s.id,
                        name: s.name,
                        onHand: s.onHand,
                      })
                    }
                    onOpenStepper={() => setStepperSupplyId(s.id)}
                  />
                ))}
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                No supplies match
              </p>
            )}
          </div>
        </div>

        <KioskCart
          cart={cart}
          submitting={submitting}
          error={error}
          onInc={(id) => dispatch({ type: "inc", supplyId: id })}
          onDec={(id) => dispatch({ type: "dec", supplyId: id })}
          onSetQty={(id, quantity) =>
            dispatch({ type: "setQty", supplyId: id, quantity })
          }
          onRemove={(id) => dispatch({ type: "remove", supplyId: id })}
          onCheckout={() => void handleCheckout()}
        />
      </div>

      <Dialog
        open={stepperSupplyId != null}
        onOpenChange={(open) => {
          if (!open) setStepperSupplyId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{stepperSupply?.name ?? stepperLine?.name}</DialogTitle>
          </DialogHeader>
          {stepperLine && (
            <div className="space-y-4 py-2">
              <QuantityStepper
                value={stepperLine.quantity}
                min={1}
                max={stepperLine.onHand}
                onChange={(quantity) =>
                  dispatch({
                    type: "setQty",
                    supplyId: stepperLine.supplyId,
                    quantity,
                  })
                }
              />
              <Button
                type="button"
                className="h-12 w-full"
                onClick={() => setStepperSupplyId(null)}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
