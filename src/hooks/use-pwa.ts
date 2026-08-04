"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IOS_INSTALL_DISMISS_KEY,
  IOS_INSTALL_DISMISS_MS,
} from "@/lib/pwa/constants";
import {
  isAndroidDevice,
  isIOSDevice,
  isSafariBrowser,
  isStandaloneDisplay,
  wasIosInstallDismissed,
} from "@/lib/pwa/detect";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface UsePWAResult {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isSafari: boolean;
  canInstall: boolean;
  install: () => Promise<boolean>;
  showIosInstallHelp: boolean;
  dismissIosInstallHelp: () => void;
}

function readDismissedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(IOS_INSTALL_DISMISS_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function usePWA(): UsePWAResult {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstallHelp, setShowIosInstallHelp] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = isIOSDevice(ua);
    const android = isAndroidDevice(ua);
    const safari = isSafariBrowser(ua);
    const standalone = isStandaloneDisplay();

    setIsIOS(ios);
    setIsAndroid(android);
    setIsSafari(safari);
    setIsStandalone(standalone);

    const dismissed = wasIosInstallDismissed(
      Date.now(),
      readDismissedAt(),
      IOS_INSTALL_DISMISS_MS
    );
    if (ios && safari && !standalone && !dismissed) {
      // Defer slightly so first paint isn't blocked by a modal.
      const timer = window.setTimeout(() => setShowIosInstallHelp(true), 1200);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowIosInstallHelp(false);
    };
    const onDisplayModeChange = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const dismissIosInstallHelp = useCallback(() => {
    setShowIosInstallHelp(false);
    try {
      window.localStorage.setItem(IOS_INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return choice.outcome === "accepted";
    }
    if (isIOS && !isStandalone) {
      setShowIosInstallHelp(true);
      return false;
    }
    return false;
  }, [deferredPrompt, isIOS, isStandalone]);

  return {
    isIOS,
    isAndroid,
    isStandalone,
    isSafari,
    canInstall: Boolean(deferredPrompt) || (isIOS && !isStandalone && isSafari),
    install,
    showIosInstallHelp,
    dismissIosInstallHelp,
  };
}
