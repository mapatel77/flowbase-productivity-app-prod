"use client";

import { useState } from "react";
import { Columns3, Plus } from "lucide-react";

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
import { MAX_COLUMNS } from "@/lib/kanban/constants";
import type { KanbanColumn } from "@/lib/kanban/types";

type ColumnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new column. */
  column: KanbanColumn | null;
  /** Used to show the current column count while creating. */
  columnCount?: number;
  busy?: boolean;
  onSubmit: (name: string) => Promise<boolean>;
};

export function ColumnDialog({
  open,
  onOpenChange,
  column,
  columnCount = 0,
  busy = false,
  onSubmit,
}: ColumnDialogProps) {
  const [name, setName] = useState(column?.name ?? "");

  const submit = async () => {
    if (!name.trim() || busy) return;
    const saved = await onSubmit(name.trim());
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {column ? "Rename column" : "New column"}
          </DialogTitle>
          <DialogDescription>
            {column
              ? "Tasks in this column stay exactly where they are."
              : `Add a column to shape your workflow. ${columnCount} of ${MAX_COLUMNS} used.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="column-name">
            <Columns3 className="size-4 text-sky-500 dark:text-sky-400" />
            Column name
          </Label>
          <Input
            id="column-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. Review"
            autoFocus
            maxLength={40}
            className="h-9 rounded-xl"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="gap-1.5"
          >
            {column ? null : <Plus className="size-4" />}
            {column ? "Save changes" : "Add column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
