"use client";

import { useEffect, useState } from "react";
import {
  KIOSK_SHOW_IMAGES_DEFAULT,
  KIOSK_SHOW_IMAGES_EVENT,
  KIOSK_SHOW_IMAGES_STORAGE_KEY,
  parseKioskShowImages,
  persistKioskShowImages,
  readKioskShowImages,
} from "@/lib/kiosk-images";

/**
 * Per-device kiosk preference: show item pictures on tiles / scan confirm.
 * Defaults to on; persists in localStorage.
 */
export function useKioskShowImages() {
  const [showImages, setShowImages] = useState(KIOSK_SHOW_IMAGES_DEFAULT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShowImages(readKioskShowImages());

    function onCustom(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setShowImages(detail);
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== KIOSK_SHOW_IMAGES_STORAGE_KEY) return;
      setShowImages(parseKioskShowImages(e.newValue));
    }

    window.addEventListener(KIOSK_SHOW_IMAGES_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(KIOSK_SHOW_IMAGES_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function setShow(next: boolean) {
    setShowImages(next);
    persistKioskShowImages(next);
  }

  function toggle() {
    setShow(!showImages);
  }

  return { showImages, setShowImages: setShow, toggle, mounted };
}
