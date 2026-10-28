"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplyImagePlaceholder } from "@/components/supplies/supply-image";
import { prepareSupplyImageForUpload } from "@/lib/supply-image-client";
import { MAX_SUPPLY_IMAGE_BYTES, supplyImageUrl } from "@/lib/supply-image";
import { cn } from "@/lib/utils";

type SupplyImageUploadProps = {
  supplyId: string;
  hasImage: boolean;
  /** When false, hide the control entirely (R2 not configured). */
  storageConfigured: boolean;
  onChanged?: (hasImage: boolean) => void;
  className?: string;
};

export function SupplyImageUpload({
  supplyId,
  hasImage: initialHasImage,
  storageConfigured,
  onChanged,
  className,
}: SupplyImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasImage, setHasImage] = useState(initialHasImage);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(!initialHasImage);

  useEffect(() => {
    setHasImage(initialHasImage);
    setShowPlaceholder(!initialHasImage);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [initialHasImage, supplyId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setImageState = useCallback(
    (next: boolean) => {
      setHasImage(next);
      setShowPlaceholder(!next);
      onChanged?.(next);
    },
    [onChanged]
  );

  if (!storageConfigured) {
    return null;
  }

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    let localPreview: string | null = null;
    try {
      const prepared = await prepareSupplyImageForUpload(file);
      localPreview = prepared.previewUrl;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return prepared.previewUrl;
      });
      setShowPlaceholder(false);

      const presignRes = await fetch(
        `/api/supplies/${encodeURIComponent(supplyId)}/image/presign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: prepared.contentType,
            contentLength: prepared.contentLength,
          }),
        }
      );
      const presign = (await presignRes.json().catch(() => ({}))) as {
        uploadUrl?: string;
        key?: string;
        headers?: Record<string, string>;
        error?: string;
      };
      if (!presignRes.ok || !presign.uploadUrl || !presign.key) {
        throw new Error(presign.error ?? "Could not start upload");
      }

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": prepared.contentType,
          "Content-Length": String(prepared.contentLength),
        },
        body: prepared.blob,
      });
      if (!putRes.ok) {
        throw new Error("Upload to storage failed");
      }

      const confirmRes = await fetch(
        `/api/supplies/${encodeURIComponent(supplyId)}/image/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: presign.key,
            contentType: prepared.contentType,
            contentLength: prepared.contentLength,
          }),
        }
      );
      const confirm = (await confirmRes.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!confirmRes.ok) {
        throw new Error(confirm.error ?? "Could not save image");
      }

      setImageState(true);
      setCacheBust(Date.now());
      toast.success("Image uploaded");
    } catch (err) {
      if (localPreview) {
        const doomed = localPreview;
        setPreviewUrl((prev) => {
          if (prev === doomed) {
            URL.revokeObjectURL(doomed);
            return null;
          }
          return prev;
        });
      }
      setShowPlaceholder(!hasImage);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/supplies/${encodeURIComponent(supplyId)}/image`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not remove image");
      }
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setImageState(false);
      setCacheBust(Date.now());
      toast.success("Image removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : hasImage && !showPlaceholder ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={cacheBust}
              src={`${supplyImageUrl(supplyId)}?v=${cacheBust}`}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setShowPlaceholder(true)}
            />
          ) : (
            <SupplyImagePlaceholder frameClassName="h-full w-full" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">Item image</p>
          <p className="text-xs text-muted-foreground">
            One image per item. Resized to WebP (~1024px) in the browser.
            Max {MAX_SUPPLY_IMAGE_BYTES / (1024 * 1024)} MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              {hasImage ? "Replace" : "Upload"}
            </Button>
            {hasImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void handleRemove()}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png,image/gif,image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
