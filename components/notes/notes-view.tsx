"use client";

import {
  NotebookPen,
  PanelLeft,
  Plus,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createNote,
  deleteNotePermanently,
  duplicateNote,
  emptyTrash,
  renameNote,
  restoreNote,
  setNoteColor,
  setNotePinned,
  softDeleteNote,
} from "@/app/notes/actions";
import { NoteDeleteDialog } from "@/components/notes/note-delete-dialog";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteRenameDialog } from "@/components/notes/note-rename-dialog";
import { NotesSidebar } from "@/components/notes/notes-sidebar";
import type { NoteSnapshot } from "@/components/notes/use-note-autosave";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster, toast } from "@/components/ui/toast";
import type { ColorToken } from "@/lib/calendar/colors";
import { noteTitle } from "@/lib/notes/content";
import type { Note, NoteSaveResult } from "@/lib/notes/types";

type NotesViewProps = {
  initialNotes: Note[];
};

type DeleteTarget =
  | { kind: "trash"; note: Note }
  | { kind: "permanent"; note: Note }
  | { kind: "empty" };

function sortActiveNotes(notes: Note[]) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id;
  });
}

function EmptyNotesState({
  busy,
  onCreate,
  onOpenList,
}: {
  busy: boolean;
  onCreate: () => void;
  onOpenList: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-amber-500/80 dark:text-amber-300/80">
        <NotebookPen className="size-10" strokeWidth={1.5} />
      </span>

      <div className="max-w-sm">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          A quiet place for your thoughts
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Capture ideas, drafts and lists in a calm, Notion-style page. Press
          slash inside the editor for blocks and formatting.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={onCreate}
          disabled={busy}
          className="gap-1.5 rounded-lg"
        >
          <Plus className="size-4" />
          Create a note
        </Button>
        <Button
          variant="ghost"
          onClick={onOpenList}
          className="gap-1.5 rounded-lg lg:hidden"
        >
          <PanelLeft className="size-4" />
          Notes & Trash
        </Button>
      </div>
    </div>
  );
}

export function NotesView({ initialNotes }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<number | null>(() => {
    const first = sortActiveNotes(
      initialNotes.filter((note) => !note.deletedAt),
    )[0];
    return first?.id ?? null;
  });
  const [justCreatedId, setJustCreatedId] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const flushRef = useRef<(() => Promise<void>) | null>(null);
  const deferredSearch = useDeferredValue(search);

  const activeNotes = useMemo(
    () => sortActiveNotes(notes.filter((note) => !note.deletedAt)),
    [notes],
  );

  const trashedNotes = useMemo(
    () =>
      notes
        .filter((note) => note.deletedAt !== null)
        .sort((a, b) => {
          const aTime = a.deletedAt?.getTime() ?? 0;
          const bTime = b.deletedAt?.getTime() ?? 0;
          return bTime - aTime || b.id - a.id;
        }),
    [notes],
  );

  const filteredNotes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return activeNotes;

    return activeNotes.filter((note) =>
      `${noteTitle(note.title)} ${note.plainText}`.toLowerCase().includes(query),
    );
  }, [activeNotes, deferredSearch]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((note) => note.pinned),
    [filteredNotes],
  );
  const otherNotes = useMemo(
    () => filteredNotes.filter((note) => !note.pinned),
    [filteredNotes],
  );

  const activeNote = useMemo(
    () =>
      notes.find(
        (note) => note.id === activeNoteId && note.deletedAt === null,
      ) ?? null,
    [notes, activeNoteId],
  );

  // If the selected note was trashed or removed, fall back to the next note.
  useEffect(() => {
    if (activeNote) return;
    setActiveNoteId(activeNotes[0]?.id ?? null);
  }, [activeNote, activeNotes]);

  const registerFlush = useCallback(
    (flush: (() => Promise<void>) | null) => {
      flushRef.current = flush;
    },
    [],
  );

  const replaceNote = useCallback((updated: Note) => {
    setNotes((current) =>
      current.map((note) => (note.id === updated.id ? updated : note)),
    );
  }, []);

  const handleSaved = useCallback(
    (id: number, result: NoteSaveResult, snapshot: NoteSnapshot) => {
      setNotes((current) =>
        current.map((note) =>
          note.id === id
            ? {
                ...note,
                title: result.title,
                plainText: result.plainText,
                content: snapshot.content,
                updatedAt: result.updatedAt,
              }
            : note,
        ),
      );
    },
    [],
  );

  const handleCreate = async () => {
    if (busy) return;

    setBusy(true);
    try {
      await flushRef.current?.();
      const result = await createNote();

      if (!result.ok) {
        toast.add({
          title: "Could not create the note",
          description: result.error,
          type: "error",
        });
        return;
      }

      setNotes((current) => [result.data, ...current]);
      setActiveNoteId(result.data.id);
      setJustCreatedId(result.data.id);
      setSearch("");
      setMobileOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = useCallback((note: Note) => {
    void flushRef.current?.();
    setActiveNoteId(note.id);
    setJustCreatedId(null);
    setMobileOpen(false);
  }, []);

  const handleTogglePin = async (note: Note) => {
    const nextPinned = !note.pinned;

    setNotes((current) =>
      current.map((item) =>
        item.id === note.id ? { ...item, pinned: nextPinned } : item,
      ),
    );

    try {
      const result = await setNotePinned({
        id: note.id,
        pinned: nextPinned,
      });

      if (!result.ok) {
        setNotes((current) =>
          current.map((item) =>
            item.id === note.id
              ? { ...item, pinned: note.pinned }
              : item,
          ),
        );
        toast.add({
          title: "Could not update the pin",
          description: result.error,
          type: "error",
        });
        return;
      }

      replaceNote(result.data);
    } catch (error) {
      setNotes((current) =>
        current.map((item) =>
          item.id === note.id ? { ...item, pinned: note.pinned } : item,
        ),
      );
      console.error("Pin update failed", error);
    }
  };

  const handleColor = async (note: Note, color: ColorToken) => {
    setNotes((current) =>
      current.map((item) =>
        item.id === note.id ? { ...item, color } : item,
      ),
    );

    try {
      const result = await setNoteColor({ id: note.id, color });

      if (!result.ok) {
        setNotes((current) =>
          current.map((item) =>
            item.id === note.id ? { ...item, color: note.color } : item,
          ),
        );
        toast.add({
          title: "Could not change the colour",
          description: result.error,
          type: "error",
        });
        return;
      }

      replaceNote(result.data);
    } catch (error) {
      setNotes((current) =>
        current.map((item) =>
          item.id === note.id ? { ...item, color: note.color } : item,
        ),
      );
      console.error("Colour update failed", error);
    }
  };

  const handleRename = async (title: string) => {
    if (!renameTarget || busy) return false;

    setBusy(true);
    try {
      const result = await renameNote({
        id: renameTarget.id,
        title,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not rename the note",
          description: result.error,
          type: "error",
        });
        return false;
      }

      replaceNote(result.data);
      setRenameTarget(null);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (note: Note) => {
    if (busy) return;

    setBusy(true);
    try {
      await flushRef.current?.();
      const result = await duplicateNote(note.id);

      if (!result.ok) {
        toast.add({
          title: "Could not duplicate the note",
          description: result.error,
          type: "error",
        });
        return;
      }

      setNotes((current) => [result.data, ...current]);
      setActiveNoteId(result.data.id);
      setJustCreatedId(null);
      setSearch("");
      setMobileOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (note: Note) => {
    if (busy) return;

    setBusy(true);
    try {
      const result = await restoreNote(note.id);

      if (!result.ok) {
        toast.add({
          title: "Could not restore the note",
          description: result.error,
          type: "error",
        });
        return;
      }

      replaceNote(result.data);
      setActiveNoteId(result.data.id);
      setJustCreatedId(null);
      setMobileOpen(false);
      toast.add({
        title: "Note restored",
        description: noteTitle(result.data.title),
        type: "success",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || busy) return;

    setBusy(true);
    try {
      if (deleteTarget.kind === "trash") {
        const { note } = deleteTarget;
        const wasActive = activeNoteId === note.id;

        if (wasActive) await flushRef.current?.();

        const result = await softDeleteNote(note.id);
        if (!result.ok) {
          toast.add({
            title: "Could not move the note to Trash",
            description: result.error,
            type: "error",
          });
          return;
        }

        replaceNote(result.data);

        if (wasActive) {
          const nextNote = activeNotes.find((item) => item.id !== note.id);
          setActiveNoteId(nextNote?.id ?? null);
        }
        if (justCreatedId === note.id) setJustCreatedId(null);

        toast.add({
          title: "Moved to Trash",
          description: noteTitle(note.title),
        });
        setDeleteTarget(null);
        return;
      }

      if (deleteTarget.kind === "permanent") {
        const { note } = deleteTarget;
        const result = await deleteNotePermanently(note.id);

        if (!result.ok) {
          toast.add({
            title: "Could not delete the note",
            description: result.error,
            type: "error",
          });
          return;
        }

        setNotes((current) =>
          current.filter((item) => item.id !== note.id),
        );
        toast.add({
          title: "Note deleted forever",
          description: noteTitle(note.title),
        });
        setDeleteTarget(null);
        return;
      }

      const result = await emptyTrash();
      if (!result.ok) {
        toast.add({
          title: "Could not empty Trash",
          description: result.error,
          type: "error",
        });
        return;
      }

      setNotes((current) =>
        current.filter((note) => note.deletedAt === null),
      );
      toast.add({
        title: "Trash emptied",
        description:
          result.data.count === 0
            ? "There was nothing left to delete."
            : `${result.data.count} note${result.data.count === 1 ? "" : "s"} deleted forever.`,
      });
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const deleteCopy = useMemo(() => {
    if (!deleteTarget) return null;

    if (deleteTarget.kind === "trash") {
      return {
        title: "Move this note to Trash?",
        description: `“${noteTitle(deleteTarget.note.title)}” will be moved to Trash. You can restore it later.`,
        confirmLabel: "Move to Trash",
      };
    }

    if (deleteTarget.kind === "permanent") {
      return {
        title: "Delete this note forever?",
        description: `“${noteTitle(deleteTarget.note.title)}” and its content will be permanently deleted. This cannot be undone.`,
        confirmLabel: "Delete forever",
      };
    }

    return {
      title: "Empty Trash?",
      description: `All ${trashedNotes.length} note${trashedNotes.length === 1 ? "" : "s"} in Trash will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Empty Trash",
    };
  }, [deleteTarget, trashedNotes.length]);

  const sidebar = (
    <NotesSidebar
      pinnedNotes={pinnedNotes}
      otherNotes={otherNotes}
      trashNotes={trashedNotes}
      activeNoteId={activeNoteId}
      search={search}
      onSearchChange={setSearch}
      onCreate={() => void handleCreate()}
      onSelect={handleSelect}
      onTogglePin={(note) => void handleTogglePin(note)}
      onRename={setRenameTarget}
      onDuplicate={(note) => void handleDuplicate(note)}
      onColor={(note, color) => void handleColor(note, color)}
      onDelete={(note) => setDeleteTarget({ kind: "trash", note })}
      onRestore={(note) => void handleRestore(note)}
      onDeleteForever={(note) =>
        setDeleteTarget({ kind: "permanent", note })
      }
      onEmptyTrash={() => {
        if (trashedNotes.length > 0) setDeleteTarget({ kind: "empty" });
      }}
      busy={busy}
    />
  );

  return (
    <>
      <div className="flex h-[calc(100svh-6.5rem)] min-h-[32rem] overflow-hidden md:h-[calc(100svh-7.5rem)]">
        <div className="hidden w-72 shrink-0 border-r border-border/60 lg:block xl:w-80">
          {sidebar}
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          {activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              autoFocusTitle={justCreatedId === activeNote.id}
              onOpenList={() => setMobileOpen(true)}
              onSaved={(result, snapshot) =>
                handleSaved(activeNote.id, result, snapshot)
              }
              onTogglePin={() => void handleTogglePin(activeNote)}
              onColor={(color) => void handleColor(activeNote, color)}
              onDuplicate={() => void handleDuplicate(activeNote)}
              onDelete={() =>
                setDeleteTarget({ kind: "trash", note: activeNote })
              }
              registerFlush={registerFlush}
            />
          ) : (
            <EmptyNotesState
              busy={busy}
              onCreate={() => void handleCreate()}
              onOpenList={() => setMobileOpen(true)}
            />
          )}
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[88vw] max-w-sm gap-0 bg-background p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Notes</SheetTitle>
            <SheetDescription>
              Browse, search and restore your notes.
            </SheetDescription>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <NoteRenameDialog
        key={renameTarget?.id ?? "closed"}
        open={renameTarget !== null}
        note={renameTarget}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSubmit={handleRename}
      />

      <NoteDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteCopy?.title ?? ""}
        description={deleteCopy?.description ?? ""}
        confirmLabel={deleteCopy?.confirmLabel ?? "Delete"}
        busy={busy}
        onConfirm={() => void handleConfirmDelete()}
      />

      <Toaster />
    </>
  );
}
