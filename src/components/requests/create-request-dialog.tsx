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
import { RequestForm } from "@/components/requests/request-form";
import { Supply } from "@/types";

interface CreateRequestDialogProps {
  supplies: Supply[];
  defaultSupplyId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateRequestDialog({
  supplies,
  defaultSupplyId,
  trigger,
  open,
  onOpenChange,
}: CreateRequestDialogProps) {
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
              New Request
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Request</DialogTitle>
        </DialogHeader>
        <RequestForm
          key={`${defaultSupplyId ?? "new"}-${dialogOpen}`}
          supplies={supplies}
          defaultSupplyId={defaultSupplyId}
          onSuccess={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
