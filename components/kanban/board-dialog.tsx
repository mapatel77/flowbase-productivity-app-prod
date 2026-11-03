"use client";

import { useState } from "react";
import { Palette, Plus } from "lucide-react";

import { ColorSwatchPicker } from "@/components/kanban/color-swatch-picker";
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
import { categoryTones, type ColorToken } from "@/lib/calendar/colors";
import type { KanbanBoard } from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

export type BoardFormValues = {
  name: string;
  color: ColorToken;
};

type BoardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new board. */
  board: KanbanBoard | null;
  busy?: boolean;
  onSubmit: (values: BoardFormValues) => Promise<boolean>;
};

export function BoardDialog({
  open,
  onOpenChange,
  board,
  busy = false,
  onSubmit,
}: BoardDialogProps) {
  // The parent remounts this dialog with a `key` whenever the target changes.
  const [name, setName] = useState(board?.name ?? "");
  const [color, setColor] = useState<ColorToken>(board?.color ?? "sky");

  const submit = async () => {
    if (!name.trim() || busy) return;
    const saved = await onSubmit({ name: name.trim(), color });
    if (saved) onOpenChange(false);
  };

  const tone = categoryTones[color];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{board ? "Edit board" : "New board"}</DialogTitle>
          <DialogDescription>
            {board
              ? "Give your board a new name or colour."
              : "Name your board and pick a colour to spot it at a glance."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="board-name">Board name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Product launch"
              autoFocus
              maxLength={60}
              className="h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              <Palette className="size-4 text-violet-500 dark:text-violet-400" />
              Board colour
            </Label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/30 p-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                tone.chip,
              )}
            >
              <span className={cn("size-2.5 rounded-full", tone.dot)} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {name.trim() || "Your board name"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Preview · Todo, In Progress, Done
              </p>
            </div>
          </div>
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
            {board ? null : <Plus className="size-4" />}
            {board ? "Save changes" : "Create board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
