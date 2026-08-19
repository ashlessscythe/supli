"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  KIOSK_SCAN_IDLE_FOCUS_MS,
  focusWithoutVirtualKeyboard,
  inputModeForScanKeyboard,
  requestVirtualKeyboardFromUserGesture,
  shouldIdleRefocusScanInput,
  shouldOpenVirtualKeyboard,
  virtualKeyboardPolicyForScanKeyboard,
  type KioskScanKeyboardMode,
} from "@/lib/kiosk-scan-focus";

export function useKioskScanFocus(
  inputRef: RefObject<HTMLInputElement | null>,
  enabled: boolean
) {
  const [mode, setMode] = useState<KioskScanKeyboardMode>("scanner");
  const openingKeyboardRef = useRef(false);

  const silentFocus = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    setMode("scanner");
    focusWithoutVirtualKeyboard(input);
  }, [inputRef]);

  useEffect(() => {
    if (!enabled) {
      setMode("scanner");
      return;
    }
    silentFocus();
  }, [enabled, silentFocus]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const input = inputRef.current;
        if (
          !shouldIdleRefocusScanInput({
            enabled: true,
            input,
            activeElement: document.activeElement,
          })
        ) {
          return;
        }
        silentFocus();
      }, KIOSK_SCAN_IDLE_FOCUS_MS);
    };

    schedule();
    window.addEventListener("pointerdown", schedule, { passive: true });
    window.addEventListener("keydown", schedule, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", schedule);
      window.removeEventListener("keydown", schedule);
    };
  }, [enabled, inputRef, silentFocus]);

  function onPointerDown(event: PointerEvent<HTMLInputElement>) {
    if (!shouldOpenVirtualKeyboard(event.pointerType)) {
      setMode("scanner");
      return;
    }

    openingKeyboardRef.current = true;
    setMode("keyboard");
    requestVirtualKeyboardFromUserGesture(event.currentTarget);
    openingKeyboardRef.current = false;
  }

  function onBlur() {
    if (openingKeyboardRef.current) return;
    setMode("scanner");
  }

  return {
    inputMode: inputModeForScanKeyboard(mode),
    virtualKeyboardPolicy: virtualKeyboardPolicyForScanKeyboard(mode),
    onPointerDown,
    onBlur,
  };
}
