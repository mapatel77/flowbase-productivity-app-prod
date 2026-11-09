"use client";

import {
  Copy,
  MoreHorizontal,
  Palette,
  Pencil,
  Pin,
  StickyNote,
  Trash2,
} from "lucide-react";

import { RelativeTime } from "@/components/notes/relative-time";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COLOR_TOKENS,
  categoryTones,
  type ColorToken,
} from "@/lib/calendar/colors";
import { noteTitle } from "@/lib/notes/content";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteListItemProps = {
  note: Note;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onColor: (color: ColorToken) => void;
  onDelete: () => void;
};

export function NoteListItem({
  note,
  active,
  onSelect,
  onTogglePin,
  onRename,
  onDuplicate,
  onColor,
  onDelete,
}: NoteListItemProps) {
  const tone = categoryTones[note.color];
  const title = noteTitle(note.title);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-0.5 rounded-md py-1.5 pl-2.5 pr-1 transition-colors",
        active
          ? "bg-sidebar-accent/25 text-sidebar-accent-foreground"
          : "hover:bg-muted/45",
      )}
    >
      {active ? (
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm px-0.5 py-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <StickyNote
          className={cn(
            "size-3.5 shrink-0",
            active ? "text-primary" : "text-muted-foreground/65",
          )}
          strokeWidth={1.8}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{title}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
            <RelativeTime value={note.updatedAt} className="truncate" />
          </span>
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onTogglePin}
        aria-label={note.pinned ? `Unpin ${title}` : `Pin ${title}`}
        aria-pressed={note.pinned}
        title={note.pinned ? "Unpin note" : "Pin note"}
        className={cn(
          "shrink-0 transition-opacity",
          note.pinned
            ? "text-primary opacity-100"
            : "text-muted-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Pin
          className="size-3.5"
          fill={note.pinned ? "currentColor" : "none"}
        />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${title} options`}
              className="shrink-0 text-muted-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onRename}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette />
              Colour
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              {COLOR_TOKENS.map((token) => (
                <DropdownMenuItem
                  key={token}
                  onClick={() => onColor(token)}
                  className="capitalize"
                >
                  <span
                    className={cn(
                      "size-3 rounded-full ring-1 ring-foreground/10",
                      categoryTones[token].dot,
                    )}
                  />
                  {token}
                  {note.color === token ? (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      current
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
