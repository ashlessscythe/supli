"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { kioskLogout } from "@/lib/actions/kiosk";
import { cn } from "@/lib/utils";
import { KioskModeSelect, type KioskModeChoice } from "./mode-select";
import { KioskScanFlow } from "./scan-flow";
import { KioskTouchFlow } from "./touch-flow";

export type KioskMode = "select" | KioskModeChoice;

export function KioskClient({ siteName }: { siteName: string }) {
  const router = useRouter();
  // Mode is React state only — never persisted (Tony).
  const [mode, setMode] = useState<KioskMode>("select");

  async function handleExit() {
    await kioskLogout();
    router.replace("/kiosk/login");
    router.refresh();
  }

  return (
    <div
      className={cn(
        "relative flex flex-col bg-background",
        // TOUCH owns the viewport: fixed dvh + overflow-hidden so safe-area
        // padding cannot grow the document past the window (no page scrollbar).
        mode === "touch"
          ? "h-[100dvh] overflow-hidden"
          : "min-h-[100dvh] safe-pad"
      )}
    >
      <Button
        variant="ghost"
        size="none"
        onClick={handleExit}
        className="absolute right-4 z-50 h-12 min-h-12 px-3 text-muted-foreground"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Exit
      </Button>

      {mode === "select" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">{siteName}</h1>
            <p className="text-sm text-muted-foreground">
              Choose how to take supplies
            </p>
          </div>
          <KioskModeSelect onSelect={setMode} />
        </div>
      )}

      {mode === "scan" && (
        <div className="flex flex-1 items-center justify-center p-4">
          <KioskScanFlow
            siteName={siteName}
            onBack={() => setMode("select")}
          />
        </div>
      )}

      {mode === "touch" && (
        <KioskTouchFlow
          siteName={siteName}
          onBack={() => setMode("select")}
          onDone={() => setMode("select")}
          onSwitchToScan={() => setMode("scan")}
        />
      )}
    </div>
  );
}
