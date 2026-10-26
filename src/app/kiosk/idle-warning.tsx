"use client";

import { Button } from "@/components/ui/button";

type IdleWarningProps = {
  secondsRemaining: number;
  onKeepGoing: () => void;
};

export function IdleWarning({
  secondsRemaining,
  onKeepGoing,
}: IdleWarningProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-6 safe-pad"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="kiosk-idle-title"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h2 id="kiosk-idle-title" className="text-2xl font-semibold">
          Still there?
        </h2>
        <p className="text-lg text-muted-foreground">
          Resetting in {secondsRemaining}…
        </p>
        <Button
          type="button"
          size="none"
          className="h-16 min-h-16 w-full text-xl touch-manipulation"
          onClick={onKeepGoing}
        >
          Keep going
        </Button>
      </div>
    </div>
  );
}
