"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Scan, LogOut } from "lucide-react";
import { kioskLogout } from "@/lib/actions/kiosk";
import { formatBarcode } from "@/lib/barcode";
import { haptic } from "@/lib/haptics";
import { enqueueOfflineMutation } from "@/lib/offline-queue";

type Step = "scan" | "quantity" | "complete";

export function KioskClient({ siteName }: { siteName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("scan");
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastItem, setLastItem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    setStep("quantity");
    setError(null);
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);

    const payload = JSON.stringify({ barcode, quantity });

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation({
        url: "/api/kiosk/consume",
        method: "POST",
        body: payload,
        label: `Consume ${quantity}× ${formatBarcode(barcode)}`,
      });
      setLoading(false);
      haptic([12, 40, 12]);
      setLastItem(formatBarcode(barcode));
      setStep("complete");
      toast.message("Saved offline — will sync when you’re back online");
      setTimeout(() => {
        setBarcode("");
        setQuantity(1);
        setStep("scan");
        setLastItem(null);
      }, 2000);
      return;
    }

    try {
      const res = await fetch("/api/kiosk/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error ?? "Failed to record consumption");
        haptic(30);
        return;
      }

      haptic([10, 30, 10]);
      setLastItem(data.name ?? barcode);
      setStep("complete");
      setTimeout(() => {
        setBarcode("");
        setQuantity(1);
        setStep("scan");
        setLastItem(null);
      }, 2000);
    } catch {
      enqueueOfflineMutation({
        url: "/api/kiosk/consume",
        method: "POST",
        body: payload,
        label: `Consume ${quantity}× ${formatBarcode(barcode)}`,
      });
      setLoading(false);
      haptic([12, 40, 12]);
      setLastItem(formatBarcode(barcode));
      setStep("complete");
      toast.message("Saved offline — will sync when you’re back online");
      setTimeout(() => {
        setBarcode("");
        setQuantity(1);
        setStep("scan");
        setLastItem(null);
      }, 2000);
    }
  }

  async function handleExit() {
    await kioskLogout();
    router.replace("/kiosk/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 safe-pad">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="absolute right-4 top-4 text-muted-foreground"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Exit
      </Button>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{siteName}</CardTitle>
          <p className="text-muted-foreground text-sm">
            Supli Mart kiosk · Scan item → Enter quantity → Complete
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "scan" && (
            <form onSubmit={handleScan} className="space-y-4">
              <div className="flex justify-center">
                <Scan className="h-16 w-16 text-muted-foreground" />
              </div>
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="h-14 text-center text-lg"
                autoComplete="off"
                inputMode="text"
                enterKeyHint="done"
                aria-label="Barcode"
              />
              <Button type="submit" className="h-12 w-full text-lg" disabled={!barcode}>
                Continue
              </Button>
            </form>
          )}

          {step === "quantity" && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Barcode: <strong>{formatBarcode(barcode)}</strong>
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 text-xl"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </Button>
                <span className="w-16 text-center text-4xl font-bold" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 text-xl"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </Button>
              </div>
              <Button
                className="h-14 w-full text-lg"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? "Processing..." : "Complete"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("scan");
                  setBarcode("");
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

          {error && (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
