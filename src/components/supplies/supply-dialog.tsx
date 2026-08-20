"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SupplyForm } from "./supply-form";

interface SupplyDialogData {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minimumThreshold: number;
  barcode?: string | null;
  internalSku?: string | null;
}

interface SupplyDialogProps {
  initialData?: SupplyDialogData;
  isAdmin?: boolean;
  /**
   * Custom trigger element. Pass `null` to render no trigger (useful when the
   * dialog is controlled from the parent). When omitted, a default
   * "Add Supply" button is rendered.
   */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SupplyDialog({
  initialData,
  isAdmin = false,
  trigger,
  open,
  onOpenChange,
}: SupplyDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supply
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Supply" : "Add Supply"}</DialogTitle>
        </DialogHeader>
        <SupplyForm
          initialData={initialData}
          isAdmin={isAdmin}
          onSuccess={() => setDialogOpen(false)}
          onCancel={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
