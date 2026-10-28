"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { supplyImageUrl } from "@/lib/supply-image";

type SupplyImageProps = {
  supplyId: string;
  hasImage?: boolean;
  alt?: string;
  className?: string;
  /** Wrapper size utilities (e.g. h-12 w-12). */
  frameClassName?: string;
};

/**
 * Theme-aware placeholder used when an item has no image or the fetch fails.
 */
export function SupplyImagePlaceholder({
  className,
  frameClassName,
}: {
  className?: string;
  frameClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md",
        "bg-muted text-muted-foreground",
        "dark:bg-muted/80",
        frameClassName
      )}
      aria-hidden
    >
      <Package className={cn("h-1/2 w-1/2 opacity-70", className)} />
    </div>
  );
}

/**
 * Same-origin supply image. Uses /api/supplies/:id/image (signed redirect),
 * never a stored R2 URL. Falls back to placeholder on error / missing image.
 */
export function SupplyImage({
  supplyId,
  hasImage = true,
  alt = "",
  className,
  frameClassName,
}: SupplyImageProps) {
  const [failed, setFailed] = useState(false);

  if (!hasImage || failed) {
    return (
      <SupplyImagePlaceholder
        className={className}
        frameClassName={frameClassName}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- private R2 via same-origin redirect; next/image remotePatterns would force public hosts
    <img
      src={supplyImageUrl(supplyId)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        "object-cover",
        frameClassName,
        className
      )}
    />
  );
}
