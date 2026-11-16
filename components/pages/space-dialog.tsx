"use client";

import { FolderPlus, Palette } from "lucide-react";
import { useState } from "react";

import { ColorSwatchPicker } from "@/components/shared/color-swatch-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { categoryTones, type ColorToken } from "@/lib/calendar/colors";
import {
  SPACE_DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
} from "@/lib/pages/constants";
import type { Space } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

export type SpaceFormValues = {
  name: string;
  description: string | null;
  color: ColorToken;
};

type SpaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new space. */
  space: Space | null;
  busy?: boolean;
  onSubmit: (values: SpaceFormValues) => Promise<boolean>;
};

/** Side panel used to create a space or rename an existing one. */
export function SpaceDialog({
  open,
  onOpenChange,
  space,
  busy = false,
  onSubmit,
}: SpaceDialogProps) {
  // The parent remounts this panel with a `key` whenever the target changes.
  const [name, setName] = useState(space?.name ?? "");
  const [description, setDescription] = useState(space?.description ?? "");
  const [color, setColor] = useState<ColorToken>(space?.color ?? "violet");

  const submit = async () => {
    if (!name.trim() || busy) return;
    const saved = await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color,
    });
    if (saved) onOpenChange(false);
  };

  const tone = categoryTones[color];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>{space ? "Edit space" : "Create a new space"}</SheetTitle>
          <SheetDescription>
            {space
              ? "Rename the space, update the description or change its colour."
              : "Spaces are top-level folders. Every page you create lives inside one."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-name">Space name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="e.g. Work Projects"
              autoFocus
              maxLength={SPACE_NAME_MAX_LENGTH}
              className="h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-description">Description</Label>
            <Textarea
              id="space-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs in this space?"
              rows={3}
              maxLength={SPACE_DESCRIPTION_MAX_LENGTH}
              className="resize-none rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              <Palette className="size-4 text-violet-500 dark:text-violet-400" />
              Colour
            </Label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                tone.chip,
              )}
            >
              <FolderPlus className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {name.trim() || "Your space name"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {description.trim() || "A short description of this space"}
              </p>
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 px-5 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || !name.trim()}
            className="gap-1.5 rounded-xl"
          >
            {space ? null : <FolderPlus className="size-4" />}
            {space ? "Save changes" : "Create space"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
