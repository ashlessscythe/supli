"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  cartTotals,
  type KioskCartLine,
  type KioskCartState,
} from "@/lib/kiosk-cart";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

type KioskCartProps = {
  cart: KioskCartState;
  submitting: boolean;
  error: string | null;
  onInc: (supplyId: string) => void;
  onDec: (supplyId: string) => void;
  onSetQty: (supplyId: string, quantity: number) => void;
  onRemove: (supplyId: string) => void;
  onCheckout: () => void;
};

function CartLineRow({
  line,
  onSetQty,
  onRemove,
}: {
  line: KioskCartLine;
  onSetQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const short =
    line.serverAvailable != null && line.serverAvailable >= 0
      ? line.serverAvailable
      : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b py-3 last:border-b-0",
        (line.missing || short != null) && "text-destructive"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{line.name}</p>
          {line.missing ? (
            <p className="text-sm">No longer available</p>
          ) : short != null ? (
            <p className="text-sm">Only {short} available</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-12 w-12 shrink-0 touch-manipulation"
          onClick={onRemove}
          aria-label={`Remove ${line.name}`}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      {!line.missing && (
        <QuantityStepper
          value={line.quantity}
          min={1}
          max={Math.max(1, line.onHand)}
          size="compact"
          onChange={onSetQty}
        />
      )}
    </div>
  );
}

function CartLines({
  cart,
  onSetQty,
  onRemove,
}: Pick<KioskCartProps, "cart" | "onSetQty" | "onRemove">) {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {cart.lines.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Cart is empty</p>
      ) : (
        cart.lines.map((line) => (
          <CartLineRow
            key={line.supplyId}
            line={line}
            onSetQty={(qty) => onSetQty(line.supplyId, qty)}
            onRemove={() => onRemove(line.supplyId)}
          />
        ))
      )}
    </div>
  );
}

export function KioskCart(props: KioskCartProps) {
  const { cart, submitting, error, onCheckout } = props;
  const { itemCount, unitCount } = cartTotals(cart);
  const [sheetOpen, setSheetOpen] = useState(false);
  const canCheckout =
    itemCount > 0 &&
    !submitting &&
    !cart.lines.some((l) => l.missing || l.quantity <= 0);

  const checkoutButton = (
    <Button
      type="button"
      className="h-14 w-full text-lg touch-manipulation"
      disabled={!canCheckout}
      onClick={() => {
        setSheetOpen(false);
        onCheckout();
      }}
    >
      {submitting ? "Checking out…" : "Checkout"}
    </Button>
  );

  return (
    <>
      {/* Landscape / wide: always-visible side panel */}
      <aside className="hidden h-full w-80 shrink-0 flex-col border-l bg-background p-4 md:landscape:flex lg:w-96">
        <h2 className="mb-2 text-xl font-semibold">Cart</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {itemCount} items · {unitCount} units
        </p>
        <CartLines {...props} />
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="mt-auto pt-4">{checkoutButton}</div>
      </aside>

      {/* Portrait / narrow: sticky bottom bar + sheet */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 safe-bottom border-t bg-background md:landscape:hidden">
          <div className="flex h-20 items-center gap-3 px-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {itemCount} items · {unitCount} units
              </p>
            </div>
            <Button
              type="button"
              className="h-14 shrink-0 touch-manipulation"
              onClick={() => setSheetOpen(true)}
            >
              Review & checkout
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 p-0 md:landscape:hidden"
        >
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Cart</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {itemCount} items · {unitCount} units
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">
            <CartLines {...props} />
          </div>
          {error && (
            <p className="px-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="sticky bottom-0 border-t bg-background p-4 safe-bottom">
            {checkoutButton}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
