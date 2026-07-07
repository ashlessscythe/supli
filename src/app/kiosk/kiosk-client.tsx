"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Scan, LogOut } from "lucide-react";
import { kioskLogout } from "@/lib/actions/kiosk";

type Step = "scan" | "quantity" | "complete";

export function KioskClient() {
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

    const res = await fetch("/api/kiosk/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode, quantity }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to record consumption");
      return;
    }

    setLastItem(data.name ?? barcode);
    setStep("complete");
    setTimeout(() => {
      setBarcode("");
      setQuantity(1);
      setStep("scan");
      setLastItem(null);
    }, 2000);
  }

  async function handleExit() {
    await kioskLogout();
    router.replace("/kiosk/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="absolute top-4 right-4 text-muted-foreground"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Exit
      </Button>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Supli Mart Kiosk</CardTitle>
          <p className="text-muted-foreground text-sm">
            Scan item → Enter quantity → Complete
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
                className="text-lg h-14 text-center"
                autoComplete="off"
              />
              <Button type="submit" className="w-full h-12 text-lg" disabled={!barcode}>
                Continue
              </Button>
            </form>
          )}

          {step === "quantity" && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Barcode: <strong>{barcode}</strong>
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 text-xl"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </Button>
                <span className="text-4xl font-bold w-16 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 text-xl"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
              <Button
                className="w-full h-14 text-lg"
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
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-xl font-semibold">Done!</p>
              {lastItem && (
                <p className="text-muted-foreground">
                  Recorded {quantity}× {lastItem}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-destructive text-center text-sm">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
