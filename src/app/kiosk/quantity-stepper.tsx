"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
  size?: "default" | "compact";
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  className,
  size = "default",
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = max != null && value >= max;
  const btnClass =
    size === "compact" ? "h-12 w-12 text-xl" : "h-14 w-14 text-xl";
  const valueClass =
    size === "compact" ? "w-12 text-2xl" : "w-16 text-4xl";

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={btnClass}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        aria-label="Decrease quantity"
      >
        −
      </Button>
      <span
        className={cn("text-center font-bold", valueClass)}
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={btnClass}
        onClick={() =>
          onChange(max != null ? Math.min(max, value + 1) : value + 1)
        }
        disabled={atMax}
        aria-label="Increase quantity"
      >
        +
      </Button>
    </div>
  );
}
