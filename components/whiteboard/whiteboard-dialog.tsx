"use client";

import { useState } from "react";
import { Presentation } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLOR_TOKENS, categoryTones, type ColorToken } from "@/lib/calendar/colors";
import { WHITEBOARD_NAME_MAX_LENGTH, type Whiteboard } from "@/lib/whiteboard/types";

type WhiteboardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whiteboard: Whiteboard | null;
  busy: boolean;
  onSubmit: (values: { name: string; color: ColorToken }) => Promise<boolean>;
};

export function WhiteboardDialog({
  open,
  onOpenChange,
  whiteboard,
  busy,
  onSubmit,
}: WhiteboardDialogProps) {
  const [name, setName] = useState(whiteboard?.name ?? "");
  const [color, setColor] = useState<ColorToken>(whiteboard?.color ?? "emerald");

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return false;
    const saved = await onSubmit({ name: trimmed, color });
    if (saved) onOpenChange(false);
    return saved;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="size-4 text-emerald-500" />
            {whiteboard ? "Rename whiteboard" : "New whiteboard"}
          </DialogTitle>
          <DialogDescription>
            Give your whiteboard a calm name and pick its accent colour.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="whiteboard-name">Name</Label>
            <Input
              id="whiteboard-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={WHITEBOARD_NAME_MAX_LENGTH}
              placeholder="e.g. Product strategy sprint"
              autoFocus
              className="h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colour</Label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_TOKENS.map((token) => {
                const selected = color === token;
                const tone = categoryTones[token];
                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setColor(token)}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "flex items-center gap-2 rounded-xl border border-primary/40 bg-background px-2 py-1.5 ring-1 ring-primary/30"
                        : "flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5 hover:bg-muted/60"
                    }
                  >
                    <span className={`size-2.5 shrink-0 rounded-full ${tone.dot}`} />
                    <span className="truncate text-[11px] font-medium capitalize text-foreground">
                      {token}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} disabled={busy}>
            Cancel
          </DialogClose>
          <Button onClick={() => void submit()} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : whiteboard ? "Save changes" : "Create whiteboard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
