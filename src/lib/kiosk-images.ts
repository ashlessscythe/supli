/** localStorage key for kiosk item-image visibility (per device). */
export const KIOSK_SHOW_IMAGES_STORAGE_KEY = "supli-kiosk-show-images";

/** Same-tab sync when the toggle flips (storage events only fire cross-tab). */
export const KIOSK_SHOW_IMAGES_EVENT = "supli-kiosk-show-images";

/** Default: images on. */
export const KIOSK_SHOW_IMAGES_DEFAULT = true;

export function parseKioskShowImages(raw: string | null | undefined): boolean {
  if (raw == null || raw === "") return KIOSK_SHOW_IMAGES_DEFAULT;
  const v = raw.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return KIOSK_SHOW_IMAGES_DEFAULT;
}

export function readKioskShowImages(): boolean {
  if (typeof window === "undefined") return KIOSK_SHOW_IMAGES_DEFAULT;
  try {
    return parseKioskShowImages(
      localStorage.getItem(KIOSK_SHOW_IMAGES_STORAGE_KEY)
    );
  } catch {
    return KIOSK_SHOW_IMAGES_DEFAULT;
  }
}

export function persistKioskShowImages(show: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KIOSK_SHOW_IMAGES_STORAGE_KEY, show ? "1" : "0");
  } catch {
    // private mode / quota — still notify listeners for this session
  }
  window.dispatchEvent(
    new CustomEvent(KIOSK_SHOW_IMAGES_EVENT, { detail: show })
  );
}
