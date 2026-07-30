"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearFiltersButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function ClearFiltersButton({
  onClick,
  disabled = false,
  label = "Clear filters",
}: ClearFiltersButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 text-muted-foreground"
    >
      <X className="mr-1 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
