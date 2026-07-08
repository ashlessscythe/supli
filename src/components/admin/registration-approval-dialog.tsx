"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Role } from "@prisma/client";

export interface ApprovalUser {
  id: string;
  username: string;
  email?: string | null;
  role: Role;
}

interface RegistrationApprovalDialogProps {
  user: ApprovalUser | null;
  open: boolean;
  action: "approve" | "reject" | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RegistrationApprovalDialog({
  user,
  open,
  action,
  loading,
  onOpenChange,
  onConfirm,
}: RegistrationApprovalDialogProps) {
  if (!action) return null;

  const isApprove = action === "approve";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "Approve registration" : "Reject registration"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "This user will be promoted to Staff and can sign in."
              : "This will permanently delete the pending account."}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Username:</span>{" "}
              <span className="font-medium">{user.username}</span>
            </p>
            {user.email && (
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{user.email}</span>
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Working..."
              : isApprove
                ? "Approve"
                : "Reject & delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
