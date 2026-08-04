"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { usePWA } from "@/hooks/use-pwa";
import { IosInstallPrompt } from "@/components/pwa/ios-install-prompt";
import { StandaloneNav } from "@/components/pwa/standalone-nav";
import { flushOfflineQueue } from "@/lib/offline-queue";
import { Button } from "@/components/ui/button";

/**
 * Client-side PWA shell: install prompts, offline queue flush, and
 * standalone bottom navigation. Safe to mount in the root layout.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const {
    isAndroid,
    canInstall,
    install,
    isStandalone,
    showIosInstallHelp,
    dismissIosInstallHelp,
  } = usePWA();
  const androidToastShown = useRef(false);

  useEffect(() => {
    if (!isAndroid || !canInstall || isStandalone || androidToastShown.current) {
      return;
    }
    androidToastShown.current = true;
    toast("Install Supli Mart", {
      description: "Add the app to your home screen for quicker access.",
      duration: 10000,
      action: {
        label: "Install",
        onClick: () => {
          void install();
        },
      },
      icon: <Download className="h-4 w-4" />,
    });
  }, [isAndroid, canInstall, isStandalone, install]);

  useEffect(() => {
    const onOnline = () => {
      void flushOfflineQueue().then(({ flushed }) => {
        if (flushed > 0) {
          toast.success(
            flushed === 1
              ? "1 queued action synced"
              : `${flushed} queued actions synced`
          );
        }
      });
    };
    window.addEventListener("online", onOnline);
    if (navigator.onLine) onOnline();
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <>
      {children}
      <StandaloneNav />
      <IosInstallPrompt
        open={showIosInstallHelp}
        onDismiss={dismissIosInstallHelp}
      />
      {/* Hidden install affordance for a11y / programmatic use via usePWA */}
      {canInstall && !isStandalone && isAndroid ? (
        <span className="sr-only">
          <Button type="button" onClick={() => void install()}>
            Install app
          </Button>
        </span>
      ) : null}
    </>
  );
}
