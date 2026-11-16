"use client";

import { FolderInput } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpaceOption } from "@/components/pages/page-dialog";

type PageMoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: SpaceOption[];
  currentSpaceId: number;
  busy?: boolean;
  onSubmit: (spaceId: number) => Promise<boolean>;
};

/** Moves a page into another space. */
export function PageMoveDialog({
  open,
  onOpenChange,
  spaces,
  currentSpaceId,
  busy = false,
  onSubmit,
}: PageMoveDialogProps) {
  const [spaceId, setSpaceId] = useState<number>(currentSpaceId);

  const options = spaces.filter((space) => space.id !== currentSpaceId);

  const submit = async () => {
    if (busy) return;
    const saved = await onSubmit(spaceId);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to another space</DialogTitle>
          <DialogDescription>
            The page keeps its content, template and favourites.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>
            <FolderInput className="size-4 text-violet-500 dark:text-violet-400" />
            Destination space
          </Label>
          <Select
            value={String(spaceId)}
            onValueChange={(value) => {
              if (value === null) return;
              setSpaceId(Number(value));
            }}
            disabled={options.length === 0}
          >
            <SelectTrigger className="h-9 w-full rounded-xl">
              <SelectValue>
                {(value) =>
                  spaces.find((space) => space.id === Number(value))?.name ??
                  "Choose a space"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((space) => (
                <SelectItem key={space.id} value={String(space.id)}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {options.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              You do not have another space to move this page to.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || options.length === 0}
            className="gap-1.5"
          >
            <FolderInput className="size-4" />
            Move page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
