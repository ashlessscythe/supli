"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Download, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  canShowSupplyQr,
  formatBarcode,
  normalizeBarcode,
} from "@/lib/barcode";

interface SupplyQrDialogProps {
  barcode: string | null | undefined;
  supplyName: string;
}

export function SupplyQrDialog({ barcode, supplyName }: SupplyQrDialogProps) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canonical = normalizeBarcode(barcode);
  const display = formatBarcode(barcode);

  if (!canShowSupplyQr(barcode) || !canonical) {
    return (
      <p className="text-xs text-muted-foreground">
        No QR code available because this item has no barcode.
      </p>
    );
  }

  const copyBarcodeText = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      toast.success("Barcode copied");
    } catch {
      toast.error("Failed to copy barcode");
    }
  };

  const copyQrImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to export QR image");

      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast.success("QR image copied");
        return;
      }

      // Fallback: download when image clipboard is unavailable
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${canonical}-qr.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("QR image downloaded");
    } catch {
      toast.error("Failed to copy QR image");
    }
  };

  const downloadQrImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }
    const url = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${canonical}-qr.png`;
    anchor.click();
    toast.success("QR image downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <QrCode className="mr-1.5 h-3.5 w-3.5" />
          Show QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR code</DialogTitle>
          <DialogDescription>
            Scan or copy the barcode for {supplyName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-md border bg-white p-4">
            <QRCodeCanvas
              value={canonical}
              size={192}
              level="M"
              includeMargin
              ref={canvasRef}
            />
          </div>
          <p className="font-mono text-sm tracking-wide">{display}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyBarcodeText}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy barcode
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyQrImage}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy QR image
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={downloadQrImage}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
