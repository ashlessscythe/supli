"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  virtualKeyboardPolicy?: "auto" | "manual";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, virtualKeyboardPolicy, ...props }, ref) => {
    const resolvedInputMode =
      inputMode ??
      (type === "number" ? "decimal" : type === "email" ? "email" : type === "tel" ? "tel" : undefined);

    return (
      <input
        type={type}
        inputMode={resolvedInputMode}
        className={cn(
          // text-base on mobile avoids iOS Safari auto-zoom on focus
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:py-1 sm:text-sm",
          className
        )}
        ref={ref}
        {...props}
        {...(virtualKeyboardPolicy
          ? { virtualkeyboardpolicy: virtualKeyboardPolicy }
          : {})}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
