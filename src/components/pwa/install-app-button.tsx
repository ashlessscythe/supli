"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/use-pwa";

/** Compact header control that triggers the platform install flow. */
export function InstallAppButton() {
  const { canInstall, isStandalone, install, isIOS } = usePWA();

  if (!canInstall || isStandalone) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isIOS ? "How to install app" : "Install app"}
      title={isIOS ? "Add to Home Screen" : "Install app"}
      onClick={() => void install()}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
