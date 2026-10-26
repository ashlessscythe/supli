export const KIOSK_COOKIE = "kiosk_session";
export const KIOSK_USERNAME = "kiosk";
// 12 hours
export const KIOSK_SESSION_MAX_AGE = 60 * 60 * 12;

/** Silently refocus the barcode field after this idle period on the scan step. */
export const KIOSK_SCAN_IDLE_FOCUS_MS = 3_000;

/** Rolling window for ranking most-used supplies on the TOUCH catalog. */
export const KIOSK_MOST_USED_WINDOW_DAYS = 90;

/** Idle overlay warning before resetting to mode select. */
export const KIOSK_IDLE_WARN_MS = 45_000;

/** Full idle reset (clear cart / leave flow → mode select). */
export const KIOSK_IDLE_RESET_MS = 60_000;

/** Duration of the success "Done!" screen before advancing. */
export const KIOSK_DONE_SCREEN_MS = 2_000;
