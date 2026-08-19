"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerateBarcodeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function GenerateBarcodeButton({
  onClick,
  disabled,
  loading,
  className,
}: GenerateBarcodeButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 px-2 text-xs", className)}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <Sparkles className="mr-1 h-3 w-3" />
      {loading ? "Generating…" : "Generate"}
    </Button>
  );
}
