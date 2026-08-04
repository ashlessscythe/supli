"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IosInstallPromptProps {
  open: boolean;
  onDismiss: () => void;
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeScreenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 12.5l2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const steps = [
  {
    title: "Tap Share",
    description: "Open the Share menu in Safari’s toolbar.",
    Icon: ShareIcon,
  },
  {
    title: "Add to Home Screen",
    description: "Scroll the sheet and choose Add to Home Screen.",
    Icon: HomeScreenIcon,
  },
  {
    title: "Tap Add",
    description: "Confirm to install Supli Mart like a native app.",
    Icon: CheckIcon,
  },
] as const;

export function IosInstallPrompt({ open, onDismiss }: IosInstallPromptProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install Supli Mart</DialogTitle>
          <DialogDescription>
            Add Supli Mart to your Home Screen for a faster, full-screen
            experience on iPhone and iPad.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 py-2">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-foreground">
                <step.Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium">
                  <span className="mr-1.5 text-muted-foreground">
                    {index + 1}.
                  </span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onDismiss}>
            Not now
          </Button>
          <Button type="button" onClick={onDismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
