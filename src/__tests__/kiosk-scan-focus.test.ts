import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyScanKeyboardMode,
  focusWithoutVirtualKeyboard,
  inputModeForScanKeyboard,
  KIOSK_SCAN_IDLE_FOCUS_MS,
  requestVirtualKeyboardFromUserGesture,
  shouldIdleRefocusScanInput,
  shouldOpenVirtualKeyboard,
  virtualKeyboardPolicyForScanKeyboard,
} from "@/lib/kiosk-scan-focus";

function createFakeInput(
  overrides: Partial<HTMLInputElement> = {}
): HTMLInputElement {
  const attributes = new Map<string, string>();
  const input = {
    inputMode: "text",
    readOnly: false,
    focus: vi.fn(),
    blur: vi.fn(),
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    ...overrides,
  };
  return input as HTMLInputElement;
}

describe("kiosk scan keyboard policy", () => {
  it("waits a few seconds before silently refocusing an unfocused scan field", () => {
    expect(KIOSK_SCAN_IDLE_FOCUS_MS).toBe(3_000);
  });

  it("opens the on-screen keyboard only for touch or pen taps", () => {
    expect(shouldOpenVirtualKeyboard("touch")).toBe(true);
    expect(shouldOpenVirtualKeyboard("pen")).toBe(true);
    expect(shouldOpenVirtualKeyboard("mouse")).toBe(false);
    expect(shouldOpenVirtualKeyboard("")).toBe(false);
  });

  it("refocuses the barcode field after idle only when it is not already focused", () => {
    const input = { id: "scan" };
    expect(
      shouldIdleRefocusScanInput({
        enabled: true,
        input,
        activeElement: { id: "elsewhere" },
      })
    ).toBe(true);
    expect(
      shouldIdleRefocusScanInput({
        enabled: true,
        input,
        activeElement: input,
      })
    ).toBe(false);
    expect(
      shouldIdleRefocusScanInput({
        enabled: false,
        input,
        activeElement: { id: "elsewhere" },
      })
    ).toBe(false);
    expect(
      shouldIdleRefocusScanInput({
        enabled: true,
        input: null,
        activeElement: null,
      })
    ).toBe(false);
  });

  it("keeps scanner mode from summoning a virtual keyboard", () => {
    expect(inputModeForScanKeyboard("scanner")).toBe("none");
    expect(virtualKeyboardPolicyForScanKeyboard("scanner")).toBe("manual");
    expect(inputModeForScanKeyboard("keyboard")).toBe("text");
    expect(virtualKeyboardPolicyForScanKeyboard("keyboard")).toBe("auto");
  });

  it("applies scanner hints onto the input element", () => {
    const input = createFakeInput();
    applyScanKeyboardMode(input, "scanner");
    expect(input.inputMode).toBe("none");
    expect(input.getAttribute("inputmode")).toBe("none");
    expect(input.getAttribute("virtualkeyboardpolicy")).toBe("manual");
  });

  it("focuses without a keyboard by using scanner hints and a readonly wrap", () => {
    const hideKeyboard = vi.fn();
    const input = createFakeInput();
    let readOnlyAtFocus = false;
    input.focus = vi.fn(() => {
      readOnlyAtFocus = input.readOnly;
    });

    focusWithoutVirtualKeyboard(input, hideKeyboard);

    expect(input.inputMode).toBe("none");
    expect(readOnlyAtFocus).toBe(true);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.readOnly).toBe(false);
    expect(hideKeyboard).toHaveBeenCalled();
  });

  it("blur-refocuses an already focused field so a tap can open the keyboard", () => {
    const showKeyboard = vi.fn();
    const input = createFakeInput();

    requestVirtualKeyboardFromUserGesture(input, showKeyboard, true);

    expect(input.inputMode).toBe("text");
    expect(input.getAttribute("virtualkeyboardpolicy")).toBe("auto");
    expect(input.blur).toHaveBeenCalledOnce();
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(showKeyboard).toHaveBeenCalledOnce();
  });

  it("does not blur when the field is not already focused", () => {
    const input = createFakeInput();
    requestVirtualKeyboardFromUserGesture(input, vi.fn(), false);
    expect(input.blur).not.toHaveBeenCalled();
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});

describe("kiosk scan field wiring", () => {
  it("uses idle scan focus instead of always opening a text keyboard", () => {
    const src = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    const hook = readFileSync("src/hooks/use-kiosk-scan-focus.ts", "utf8");
    expect(src).toContain("useKioskScanFocus");
    expect(src).toContain("virtualKeyboardPolicy");
    expect(src).not.toContain('inputMode="text"');
    expect(src).not.toContain("inputRef.current?.focus()");
    expect(hook).toContain("KIOSK_SCAN_IDLE_FOCUS_MS");
  });
});
