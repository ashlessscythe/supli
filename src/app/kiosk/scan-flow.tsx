"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Scan, ArrowLeft } from "lucide-react";
import { useKioskScanFocus } from "@/hooks/use-kiosk-scan-focus";
import { useKioskIdleReset } from "@/hooks/use-kiosk-idle-reset";
import { formatBarcode } from "@/lib/barcode";
import { haptic } from "@/lib/haptics";
import { selectScanInputForRetry } from "@/lib/kiosk-scan-focus";
import { resolveKioskScanLookup } from "@/lib/kiosk-scan-lookup";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import { KIOSK_DONE_SCREEN_MS } from "@/lib/kiosk-constants";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";
import { IdleWarning } from "./idle-warning";

type Step = "scan" | "quantity" | "complete";

type KioskScanFlowProps = {
  siteName: string;
  onBack: () => void;
};

export function KioskScanFlow({ siteName, onBack }: KioskScanFlowProps) {
  const [step, setStep] = useState<Step>("scan");
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lastItem, setLastItem] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanFocus = useKioskScanFocus(inputRef, step === "scan");

  const idle = useKioskIdleReset(step === "quantity", () => {
    setStep("scan");
    setBarcode("");
    setQuantity(1);
    setItemName(null);
    setError(null);
    onBack();
  });

  useEffect(() => {
    if (step !== "scan" || !error || lookingUp) return;
    selectScanInputForRetry(inputRef.current);
  }, [step, error, lookingUp]);

  function resetToScan() {
    setBarcode("");
    setQuantity(1);
    setItemName(null);
    setStep("scan");
    setLastItem(null);
    setError(null);
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim() || lookingUp) return;

    setLookingUp(true);
    setError(null);

    try {
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (!online) {
        const skipped = resolveKioskScanLookup({ online: false });
        setItemName(skipped.itemName);
        setStep("quantity");
        return;
      }

      const res = await fetch(
        `/api/kiosk/lookup?barcode=${encodeURIComponent(barcode.trim())}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        name?: string;
        error?: string;
      };
      const result = resolveKioskScanLookup({
        online: true,
        ok: res.ok,
        name: data.name,
        error: data.error,
      });

      if (!result.proceed) {
        setError(result.error);
        haptic(30);
        return;
      }

      setItemName(result.itemName);
      setStep("quantity");
    } catch {
      const skipped = resolveKioskScanLookup({
        online: true,
        lookupFailedNetwork: true,
      });
      setItemName(skipped.itemName);
      setStep("quantity");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);

    const payload = JSON.stringify({ barcode, quantity });

    const finishSuccess = (name: string, offline: boolean) => {
      setLoading(false);
      haptic(offline ? [12, 40, 12] : [10, 30, 10]);
      setLastItem(name);
      setStep("complete");
      if (offline) {
        toast.message("Saved offline — will sync when you’re back online");
      }
      // Tony: SCAN loops until Back or idle reset (does not return to mode select).
      setTimeout(() => {
        resetToScan();
      }, KIOSK_DONE_SCREEN_MS);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation({
        url: "/api/kiosk/consume",
        method: "POST",
        body: payload,
        label: `Consume ${quantity}× ${formatBarcode(barcode)}`,
      });
      finishSuccess(formatBarcode(barcode), true);
      return;
    }

    try {
      const res = await fetch("/api/kiosk/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data.error ?? "Failed to record consumption");
        haptic(30);
        return;
      }

      finishSuccess(data.name ?? barcode, false);
    } catch {
      enqueueOfflineMutation({
        url: "/api/kiosk/consume",
        method: "POST",
        body: payload,
        label: `Consume ${quantity}× ${formatBarcode(barcode)}`,
      });
      finishSuccess(formatBarcode(barcode), true);
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-col">
      {idle.showWarning && (
        <IdleWarning
          secondsRemaining={idle.secondsRemaining}
          onKeepGoing={idle.keepGoing}
        />
      )}
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-start">
            <Button
              type="button"
              variant="ghost"
              size="none"
              className="h-12 min-h-12 px-3 touch-manipulation"
              onClick={onBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <CardTitle className="text-2xl">{siteName}</CardTitle>
          <p className="text-muted-foreground text-sm">
            Supli Mart kiosk · Scan item → Enter quantity → Complete
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "scan" && (
            <form onSubmit={handleScan} className="space-y-4">
              <div className="flex justify-center">
                <Scan
                  className={cn(
                    "h-16 w-16",
                    error ? "text-destructive" : "text-muted-foreground"
                  )}
                />
              </div>
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  if (error) setError(null);
                }}
                onPointerDown={scanFocus.onPointerDown}
                onBlur={scanFocus.onBlur}
                placeholder="Scan or enter barcode"
                className={cn(
                  "h-14 text-center text-lg",
                  error &&
                    "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive focus-visible:ring-destructive"
                )}
                autoComplete="off"
                inputMode={scanFocus.inputMode}
                virtualKeyboardPolicy={scanFocus.virtualKeyboardPolicy}
                enterKeyHint="done"
                aria-label="Barcode"
                aria-invalid={!!error}
              />
              {error && (
                <p
                  className="text-center text-sm font-medium text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="none"
                className="h-12 min-h-12 w-full text-lg"
                disabled={!barcode || lookingUp}
              >
                {lookingUp ? "Checking…" : "Continue"}
              </Button>
            </form>
          )}

          {step === "quantity" && (
            <div className="space-y-4">
              {itemName && (
                <p className="text-center text-xl font-semibold">{itemName}</p>
              )}
              <p className="text-center text-muted-foreground">
                Barcode: <strong>{formatBarcode(barcode)}</strong>
              </p>
              <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
              <Button
                size="none"
                className="h-14 min-h-14 w-full text-lg"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? "Processing..." : "Complete"}
              </Button>
              <Button
                variant="ghost"
                size="none"
                className="h-12 min-h-12 w-full"
                onClick={() => {
                  setStep("scan");
                  setBarcode("");
                  setQuantity(1);
                  setItemName(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-4 py-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <p className="text-xl font-semibold">Done!</p>
              {lastItem && (
                <p className="text-muted-foreground">
                  Recorded {quantity}× {lastItem}
                </p>
              )}
            </div>
          )}

          {error && step !== "scan" && (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
