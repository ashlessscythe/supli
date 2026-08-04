"use client";

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export function canShare(payload?: SharePayload): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (payload?.files?.length && typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({ files: payload.files });
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Share via the Web Share API when available; falls back to clipboard copy of url/text.
 */
export async function shareOrCopy(payload: SharePayload): Promise<"shared" | "copied" | "failed"> {
  if (canShare(payload)) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (error) {
      // User cancelled — treat as non-failure for callers that only care about success UX.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "failed";
      }
    }
  }

  const fallback = payload.url ?? payload.text;
  if (!fallback) return "failed";

  try {
    await navigator.clipboard.writeText(fallback);
    return "copied";
  } catch {
    return "failed";
  }
}
