"use client";

import { useState } from "react";
import {
  ChevronDown,
  NotebookPen,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { NoteListItem } from "@/components/notes/note-list-item";
import { RelativeTime } from "@/components/notes/relative-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ColorToken } from "@/lib/calendar/colors";
import { noteTitle } from "@/lib/notes/content";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NotesSidebarProps = {
  pinnedNotes: Note[];
  otherNotes: Note[];
  trashNotes: Note[];
  activeNoteId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onSelect: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onRename: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onColor: (note: Note, color: ColorToken) => void;
  onDelete: (note: Note) => void;
  onRestore: (note: Note) => void;
  onDeleteForever: (note: Note) => void;
  onEmptyTrash: () => void;
  busy?: boolean;
  className?: string;
};

export function NotesSidebar({
  pinnedNotes,
  otherNotes,
  trashNotes,
  activeNoteId,
  search,
  onSearchChange,
  onCreate,
  onSelect,
  onTogglePin,
  onRename,
  onDuplicate,
  onColor,
  onDelete,
  onRestore,
  onDeleteForever,
  onEmptyTrash,
  busy = false,
  className,
}: NotesSidebarProps) {
  const [trashOpen, setTrashOpen] = useState(false);
  const total = pinnedNotes.length + otherNotes.length;
  const hasSearch = search.trim().length > 0;
  const noMatches = total === 0;

  return (
    <aside className={cn("flex h-full min-h-0 flex-col p-3 lg:pr-4", className)}>
      <div className="shrink-0 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold tracking-tight">
              <NotebookPen className="size-3.5 text-amber-500 dark:text-amber-300" />
              Notes
            </h2>
            <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground">
              {hasSearch
                ? `${total} result${total === 1 ? "" : "s"}`
                : `${total} note${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreate}
            disabled={busy}
            className="-mr-1 h-8 gap-1 rounded-full px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="size-3.5" />
            New note
          </Button>
        </div>

        <div className="relative mt-3 border-b border-border/60 transition-colors focus-within:border-foreground/30">
          <Search className="pointer-events-none absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
            className="h-8 rounded-none border-0 bg-transparent pr-8 pl-6 text-xs shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear note search"
              className="absolute top-1/2 right-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {noMatches ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <NotebookPen className="size-5 text-muted-foreground/60" />
            <p className="text-[11px] font-medium text-muted-foreground">
              {hasSearch ? "No notes match that search" : "Create your first note"}
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              {hasSearch
                ? "Try a different word, or clear the search."
                : "A quiet place for thoughts, drafts and ideas."}
            </p>
            {hasSearch ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange("")}
                className="mt-1 rounded-full text-[11px]"
              >
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {pinnedNotes.length > 0 ? (
              <>
                <p className="px-1 pt-1 text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Pinned
                </p>
                {pinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    active={note.id === activeNoteId}
                    onSelect={() => onSelect(note)}
                    onTogglePin={() => onTogglePin(note)}
                    onRename={() => onRename(note)}
                    onDuplicate={() => onDuplicate(note)}
                    onColor={(color) => onColor(note, color)}
                    onDelete={() => onDelete(note)}
                  />
                ))}
              </>
            ) : null}

            {otherNotes.length > 0 ? (
              <>
                <p className="px-1 pt-2 text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {pinnedNotes.length > 0 ? "Notes" : "All notes"}
                </p>
                {otherNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    active={note.id === activeNoteId}
                    onSelect={() => onSelect(note)}
                    onTogglePin={() => onTogglePin(note)}
                    onRename={() => onRename(note)}
                    onDuplicate={() => onDuplicate(note)}
                    onColor={(color) => onColor(note, color)}
                    onDelete={() => onDelete(note)}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-2 shrink-0 border-t border-border/70 pt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTrashOpen((open) => !open)}
            aria-expanded={trashOpen}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <Trash2 className="size-3.5" />
            <span>Trash</span>
            <span className="text-[10px] tabular-nums text-muted-foreground/60">
              {trashNotes.length}
            </span>
            <ChevronDown
              className={cn(
                "ml-auto size-3.5 transition-transform",
                trashOpen && "rotate-180",
              )}
            />
          </button>
          {trashOpen && trashNotes.length > 0 ? (
            <button
              type="button"
              onClick={onEmptyTrash}
              disabled={busy}
              className="shrink-0 rounded-md px-1.5 py-1 text-[10px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Empty
            </button>
          ) : null}
        </div>

        {trashOpen ? (
          <div className="mt-1.5 max-h-44 overflow-y-auto pr-0.5">
            {trashNotes.length === 0 ? (
              <p className="px-1.5 py-2 text-[10px] text-muted-foreground">
                Trash is empty.
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {trashNotes.map((note) => (
                  <div
                    key={note.id}
                    className="group flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-muted-foreground">
                        {noteTitle(note.title)}
                      </span>
                      {note.deletedAt ? (
                        <RelativeTime
                          value={note.deletedAt}
                          className="block truncate text-[9px] text-muted-foreground/80"
                        />
                      ) : null}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onRestore(note)}
                      disabled={busy}
                      aria-label={`Restore ${noteTitle(note.title)}`}
                      title="Restore note"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDeleteForever(note)}
                      disabled={busy}
                      aria-label={`Delete ${noteTitle(note.title)} forever`}
                      title="Delete forever"
                      className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
