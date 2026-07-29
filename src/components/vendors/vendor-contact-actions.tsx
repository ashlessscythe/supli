"use client";

import { Mail, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isVendorEmail, normalizeWebsiteUrl } from "@/lib/vendor-contact";

interface VendorContactActionsProps {
  website?: string | null;
  contact?: string | null;
  className?: string;
}

export function VendorContactActions({
  website,
  contact,
  className,
}: VendorContactActionsProps) {
  const hasWebsite = Boolean(website?.trim());
  const email = contact?.trim() ?? "";
  const hasEmail = isVendorEmail(email);

  if (!hasWebsite && !hasEmail) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {hasWebsite && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          asChild
        >
          <a
            href={normalizeWebsiteUrl(website!)}
            target="_blank"
            rel="noreferrer noopener"
            title="Reorder"
            aria-label="Reorder"
          >
            <PackagePlus className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
      {hasEmail && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          asChild
        >
          <a
            href={`mailto:${email}`}
            title="Email this vendor"
            aria-label="Email this vendor"
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
}
