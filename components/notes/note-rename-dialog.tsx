"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

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
import { NOTE_TITLE_MAX_LENGTH } from "@/lib/notes/constants";
import { noteTitle } from "@/lib/notes/content";
import type { Note } from "@/lib/notes/types";

type NoteRenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  busy?: boolean;
  onSubmit: (title: string) => Promise<boolean>;
};

/**
 * The parent remounts this dialog with a key whenever the target note changes,
 * so the input always starts from the current title.
 */
export function NoteRenameDialog({
  open,
  onOpenChange,
  note,
  busy = false,
  onSubmit,
}: NoteRenameDialogProps) {
  const [title, setTitle] = useState(note ? noteTitle(note.title) : "");

  const submit = async () => {
    const next = title.trim();
    if (!next || busy) return;
    const saved = await onSubmit(next);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-amber-500" />
            Rename note
          </DialogTitle>
          <DialogDescription>
            Give this note a clearer name. You can also edit the title directly
            in the editor.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Label htmlFor="note-rename-title">Title</Label>
          <Input
            id="note-rename-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={NOTE_TITLE_MAX_LENGTH}
            autoFocus
            className="h-9 rounded-xl"
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} disabled={busy}>
            Cancel
          </DialogClose>
          <Button onClick={() => void submit()} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Save title"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
