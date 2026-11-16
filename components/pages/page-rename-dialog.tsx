"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_TITLE_MAX_LENGTH } from "@/lib/pages/constants";
import { pageTitle } from "@/lib/pages/content";

type PageRenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
  busy?: boolean;
  onSubmit: (title: string) => Promise<boolean>;
};

/** Renames a page. */
export function PageRenameDialog({
  open,
  onOpenChange,
  initialTitle,
  busy = false,
  onSubmit,
}: PageRenameDialogProps) {
  const [title, setTitle] = useState(initialTitle);

  const submit = async () => {
    if (busy || !title.trim()) return;
    const saved = await onSubmit(title.trim());
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename page</DialogTitle>
          <DialogDescription>
            Give the page a clearer name so the team can find it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="page-rename-title">Page name</Label>
          <Input
            id="page-rename-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={pageTitle(initialTitle)}
            autoFocus
            maxLength={PAGE_TITLE_MAX_LENGTH}
            className="h-9 rounded-xl"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || !title.trim()}
            className="gap-1.5"
          >
            <Pencil className="size-4" />
            Save name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
