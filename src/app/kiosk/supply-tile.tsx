"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SupplyTileProps = {
  name: string;
  onHand: number;
  inCart: number;
  onAdd: () => void;
  onOpenStepper?: () => void;
};

export function SupplyTile({
  name,
  onHand,
  inCart,
  onAdd,
  onOpenStepper,
}: SupplyTileProps) {
  const out = onHand <= 0;
  const atMax = inCart > 0 && inCart >= onHand;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={out}
      onClick={() => {
        if (out) return;
        if (inCart > 0 && onOpenStepper) {
          onOpenStepper();
          return;
        }
        onAdd();
      }}
      className={cn(
        "relative flex min-h-24 h-auto w-full flex-col items-start justify-between gap-2 p-4 text-left touch-manipulation select-none",
        out && "opacity-60"
      )}
    >
      {inCart > 0 && (
        <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-md bg-primary px-1.5 text-sm font-semibold text-primary-foreground">
          {inCart}
        </span>
      )}
      <span className="line-clamp-2 text-lg font-semibold leading-snug pr-8">
        {name}
      </span>
      <span className="text-sm text-muted-foreground">
        {out
          ? "Out of stock"
          : atMax
            ? `${onHand} on hand · max`
            : `${onHand} on hand`}
      </span>
    </Button>
  );
}
