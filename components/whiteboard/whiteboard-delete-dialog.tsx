"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Whiteboard } from "@/lib/whiteboard/types";

type WhiteboardDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whiteboard: Whiteboard | null;
  busy: boolean;
  onConfirm: () => Promise<void>;
};

export function WhiteboardDeleteDialog({
  open,
  onOpenChange,
  whiteboard,
  busy,
  onConfirm,
}: WhiteboardDeleteDialogProps) {
  const confirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            Delete whiteboard?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {whiteboard
              ? `“${whiteboard.name}” and its canvas will be permanently deleted. This cannot be undone.`
              : "This whiteboard and its canvas will be permanently deleted."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void confirm()}>
            Delete whiteboard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
