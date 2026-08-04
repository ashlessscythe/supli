export function isIOSDevice(
  ua: string = "",
  maxTouchPoints?: number
): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ identifies as Macintosh with touch
  const touches =
    maxTouchPoints ??
    (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
  return /Macintosh/.test(ua) && touches > 1;
}

export function isAndroidDevice(ua: string = ""): boolean {
  return /Android/i.test(ua);
}

export function isSafariBrowser(ua: string = ""): boolean {
  const isDesktopSafari =
    /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua);
  const isIOSWebKit =
    /iPad|iPhone|iPod/.test(ua) &&
    /WebKit/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isDesktopSafari || isIOSWebKit;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function wasIosInstallDismissed(
  now = Date.now(),
  storedAt: number | null = null,
  dismissMs = 30 * 24 * 60 * 60 * 1000
): boolean {
  if (storedAt == null || Number.isNaN(storedAt)) return false;
  return now - storedAt < dismissMs;
}
