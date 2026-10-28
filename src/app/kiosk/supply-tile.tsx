"use client";

import { cn } from "@/lib/utils";
import { SupplyImage } from "@/components/supplies/supply-image";

type SupplyTileProps = {
  supplyId: string;
  name: string;
  onHand: number;
  inCart: number;
  hasImage?: boolean;
  onAdd: () => void;
  onOpenStepper?: () => void;
};

export function SupplyTile({
  supplyId,
  name,
  onHand,
  inCart,
  hasImage = false,
  onAdd,
  onOpenStepper,
}: SupplyTileProps) {
  const out = onHand <= 0;
  const atMax = inCart > 0 && inCart >= onHand;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => {
        if (out) return;
        if (inCart > 0 && onOpenStepper) {
          onOpenStepper();
          return;
        }
        onAdd();
      }}
      aria-label={
        out
          ? `${name}, out of stock`
          : inCart > 0
            ? `${name}, ${inCart} in cart, ${onHand} on hand`
            : `${name}, ${onHand} on hand`
      }
      className={cn(
        // Plain button — avoid shadcn Button h-10 / whitespace-nowrap clipping.
        "relative flex min-h-24 w-full flex-col items-stretch gap-2 overflow-visible whitespace-normal rounded-md border border-input bg-background p-4 text-left shadow-sm",
        "touch-manipulation select-none transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-60",
        "active:scale-[0.98] motion-reduce:active:scale-100"
      )}
    >
      {inCart > 0 && (
        <span
          className="absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-md bg-primary px-1.5 text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          {inCart}
        </span>
      )}
      <SupplyImage
        supplyId={supplyId}
        hasImage={hasImage}
        alt=""
        frameClassName="aspect-[4/3] w-full rounded-md"
      />
      <span className="line-clamp-2 w-full whitespace-normal break-words pr-9 text-lg font-semibold leading-snug">
        {name}
      </span>
      <span className="text-sm text-muted-foreground">
        {out
          ? "Out of stock"
          : atMax
            ? `${onHand} on hand · max`
            : `${onHand} on hand`}
      </span>
    </button>
  );
}
