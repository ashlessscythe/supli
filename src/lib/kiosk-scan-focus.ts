import { KIOSK_SCAN_IDLE_FOCUS_MS } from "@/lib/kiosk-constants";

export { KIOSK_SCAN_IDLE_FOCUS_MS };

export type KioskScanKeyboardMode = "scanner" | "keyboard";

type VirtualKeyboardLike = {
  overlaysContent: boolean;
  show: () => void;
  hide: () => void;
};

function getVirtualKeyboard(): VirtualKeyboardLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { virtualKeyboard?: VirtualKeyboardLike })
    .virtualKeyboard;
}

export function shouldOpenVirtualKeyboard(pointerType: string): boolean {
  // Only a direct finger/stylus tap on the field should summon the OS keyboard.
  // Mouse clicks and programmatic focus stay in scanner mode for HID barcode wedges.
  return pointerType === "touch" || pointerType === "pen";
}

export function shouldIdleRefocusScanInput(options: {
  enabled: boolean;
  input: unknown;
  activeElement: unknown;
}): boolean {
  if (!options.enabled || options.input == null) return false;
  return options.activeElement !== options.input;
}

export function inputModeForScanKeyboard(
  mode: KioskScanKeyboardMode
): "none" | "text" {
  return mode === "keyboard" ? "text" : "none";
}

export function virtualKeyboardPolicyForScanKeyboard(
  mode: KioskScanKeyboardMode
): "auto" | "manual" {
  return mode === "keyboard" ? "auto" : "manual";
}

export function applyScanKeyboardMode(
  input: {
    inputMode: HTMLInputElement["inputMode"];
    setAttribute: HTMLInputElement["setAttribute"];
  },
  mode: KioskScanKeyboardMode
): void {
  const inputMode = inputModeForScanKeyboard(mode);
  input.inputMode = inputMode;
  input.setAttribute("inputmode", inputMode);
  input.setAttribute(
    "virtualkeyboardpolicy",
    virtualKeyboardPolicyForScanKeyboard(mode)
  );
}

export function hideVirtualKeyboard(): void {
  try {
    getVirtualKeyboard()?.hide();
  } catch {
    // VirtualKeyboard API is optional; inputMode/policy still suppress most OS keyboards.
  }
}

export function showVirtualKeyboard(): void {
  try {
    const virtualKeyboard = getVirtualKeyboard();
    if (!virtualKeyboard) return;
    virtualKeyboard.overlaysContent = true;
    virtualKeyboard.show();
  } catch {
    // show() requires a focused element inside a user gesture.
  }
}

/**
 * Focus the barcode field without treating it as a request for the on-screen
 * keyboard. HID scanners can still type into a focused input.
 */
export function focusWithoutVirtualKeyboard(
  input: HTMLInputElement,
  hideKeyboard: () => void = hideVirtualKeyboard
): void {
  applyScanKeyboardMode(input, "scanner");
  const previousReadOnly = input.readOnly;
  // iOS/Android skip the VK for a readOnly focus; restore immediately so wedges can type.
  input.readOnly = true;
  input.focus({ preventScroll: true });
  input.readOnly = previousReadOnly;
  hideKeyboard();
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => hideKeyboard());
  }
}

/**
 * Open the OS keyboard in response to a real tap on the barcode field.
 * If the field is already focused from silent autofocus, blur+refocus so the
 * OS sees a user-gesture focus after inputMode switches to text.
 */
export function requestVirtualKeyboardFromUserGesture(
  input: HTMLInputElement,
  showKeyboard: () => void = showVirtualKeyboard,
  alreadyFocused: boolean = typeof document !== "undefined" &&
    document.activeElement === input
): void {
  applyScanKeyboardMode(input, "keyboard");
  if (alreadyFocused) {
    input.blur();
  }
  input.focus({ preventScroll: true });
  showKeyboard();
}
