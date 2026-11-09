"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CheckCircle2,
  CircleAlert,
  Cloud,
  Copy,
  Loader2,
  Mic,
  MoreHorizontal,
  PanelLeft,
  Pin,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { refineNoteText, saveNote } from "@/app/notes/actions";
import { NoteBubbleMenu } from "@/components/notes/note-bubble-menu";
import { NoteColorPopover } from "@/components/notes/note-color-popover";
import { NoteEditorToolbar } from "@/components/notes/note-editor-toolbar";
import { SlashCommand } from "@/components/notes/note-slash-command";
import { RelativeTime } from "@/components/notes/relative-time";
import { useAssemblyAIStreaming } from "@/hooks/use-assemblyai-streaming";
import {
  useNoteAutosave,
  type NoteSnapshot,
} from "@/components/notes/use-note-autosave";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { categoryTones, type ColorToken } from "@/lib/calendar/colors";
import {
  NOTE_TITLE_MAX_LENGTH,
  REFINE_MODE_LABELS,
  REFINE_TONE_LABELS,
} from "@/lib/notes/constants";
import { countWords, extractPlainText } from "@/lib/notes/content";
import type {
  Note,
  NoteDocument,
  NoteSaveResult,
  RefineMode,
  RefineTone,
} from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteEditorProps = {
  note: Note;
  autoFocusTitle?: boolean;
  onOpenList: () => void;
  onSaved: (result: NoteSaveResult, snapshot: NoteSnapshot) => void;
  onTogglePin: () => void;
  onColor: (color: ColorToken) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  registerFlush: (flush: (() => Promise<void>) | null) => void;
};

/**
 * Gemini returns plain text. A single-line result can be inserted as an inline
 * text node; multi-line results become paragraphs so the document stays valid.
 */
function refinedTextToContent(text: string): JSONContent {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return { type: "text", text };
  }

  return lines.map((line) => ({
    type: "paragraph",
    content: [{ type: "text", text: line }],
  }));
}

export function NoteEditor({
  note,
  autoFocusTitle = false,
  onOpenList,
  onSaved,
  onTogglePin,
  onColor,
  onDuplicate,
  onDelete,
  registerFlush,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [plainText, setPlainText] = useState(note.plainText);
  const [refining, setRefining] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleValueRef = useRef(note.title);
  const latestContentRef = useRef<NoteDocument>(note.content);
  const latestPlainTextRef = useRef(note.plainText);
  const editorInstanceRef = useRef<Editor | null>(null);
  const cursorPositionRef = useRef<number | null>(null);
  const hasCursorRef = useRef(false);
  const isInsertingTranscriptRef = useRef(false);

  const saveSnapshot = useCallback(
    (snapshot: NoteSnapshot) =>
      saveNote({
        id: note.id,
        title: snapshot.title,
        content: snapshot.content,
      }),
    [note.id],
  );

  const handleSaved = useCallback(
    (result: NoteSaveResult, snapshot: NoteSnapshot) => {
      onSaved(result, snapshot);
    },
    [onSaved],
  );

  const {
    markDirty,
    flush,
    state: saveState,
    lastSavedAt,
    error: saveError,
  } = useNoteAutosave({
    initialUpdatedAt: note.updatedAt,
    save: saveSnapshot,
    onSaved: handleSaved,
  });

  const editor = useEditor({
    immediatelyRender: false,
    content: note.content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TaskList,
      TaskItem,
      Highlight,
      Placeholder.configure({
        placeholder: "Press / for commands…",
        showOnlyCurrent: true,
        showOnlyWhenEditable: true,
      }),
      SlashCommand,
    ],
    editorProps: {
      attributes: {
        class: "note-prose min-h-[52vh] focus:outline-none",
        "aria-label": "Note body",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      const content = current.getJSON();
      const text = extractPlainText(content);

      latestContentRef.current = content;
      latestPlainTextRef.current = text;
      setPlainText(text);

      markDirty({
        title: titleValueRef.current,
        content,
        plainText: text,
      });
    },
    onFocus: ({ editor: current }) => {
      hasCursorRef.current = true;
      cursorPositionRef.current = current.state.selection.to;
    },
    onSelectionUpdate: ({ editor: current }) => {
      if (!current.isFocused || isInsertingTranscriptRef.current) return;
      hasCursorRef.current = true;
      cursorPositionRef.current = current.state.selection.to;
    },
  });

  useEffect(() => {
    editorInstanceRef.current = editor;
    return () => {
      if (editorInstanceRef.current === editor) editorInstanceRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    registerFlush(flush);
    return () => registerFlush(null);
  }, [flush, registerFlush]);

  const insertTranscript = useCallback(
    (raw: string) => {
      const current = editorInstanceRef.current;
      if (!current || current.isDestroyed) return;

      const text = raw.replace(/\s+/g, " ").trim();
      if (!text) return;

      const { doc, selection } = current.state;
      const hasCursor = hasCursorRef.current;
      let position = hasCursor
        ? Math.min(
            Math.max(cursorPositionRef.current ?? selection.to, 0),
            doc.content.size,
          )
        : doc.content.size;

      // A text node keeps spoken words literal instead of parsing them as HTML.
      // The separator is decided at the real insertion point so appending to an
      // existing paragraph does not produce "Helloworld".
      const buildContent = (at: number) => {
        const previousCharacter =
          at > 1 ? doc.textBetween(at - 1, at, "", "") : "";
        const spokenText =
          at > 0 && previousCharacter && !/\s/.test(previousCharacter)
            ? ` ${text}`
            : text;

        return {
          node: { type: "text", text: spokenText } satisfies JSONContent,
          length: spokenText.length,
        };
      };

      isInsertingTranscriptRef.current = true;

      try {
        let inserted = false;

        if (hasCursor) {
          const content = buildContent(position);
          inserted = current.chain().insertContentAt(position, content.node).run();
          if (inserted) position += content.length;
        }

        if (!inserted) {
          // No active cursor, or the remembered position is no longer valid:
          // append to the end of the note instead.
          current.chain().focus("end").run();
          position = current.state.selection.to;
          const content = buildContent(position);
          current.chain().insertContent(content.node).run();
          position = current.state.selection.to;
        }
      } catch (insertError) {
        console.error("Could not insert the voice transcript", insertError);
        return;
      } finally {
        isInsertingTranscriptRef.current = false;
      }

      cursorPositionRef.current = position;
      hasCursorRef.current = true;

      // Keep the visible caret after the spoken text when the editor is active.
      if (current.isFocused) {
        try {
          current.commands.setTextSelection(position);
        } catch {
          // The document may have changed while the transcript arrived.
        }
      }

      // `onUpdate` marks the note dirty; flush so spoken text is persisted right
      // away instead of waiting for the next debounce window.
      void flush();
    },
    [flush],
  );

  const {
    status: voiceStatus,
    isRecording,
    isActive: voiceActive,
    partialTranscript,
    toggle: toggleVoice,
    stop: stopVoice,
  } = useAssemblyAIStreaming({
    onFinalTranscript: insertTranscript,
    onError: (message) => {
      toast.add({
        title: "Speak to Note",
        description: message,
        type: "error",
      });
    },
  });

  // Keep the title in sync when a rename happens outside the editor (for
  // example from the sidebar) without stealing the caret while typing.
  useEffect(() => {
    if (titleRef.current && document.activeElement === titleRef.current) return;
    if (note.title === titleValueRef.current) return;

    titleValueRef.current = note.title;
    setTitle(note.title);
  }, [note.title]);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;

    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, 34)}px`;
  }, [title]);

  useEffect(() => {
    if (!autoFocusTitle) return;

    const timeout = window.setTimeout(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [autoFocusTitle]);

  const handleTitleChange = (value: string) => {
    const next = value.slice(0, NOTE_TITLE_MAX_LENGTH);
    titleValueRef.current = next;
    setTitle(next);

    markDirty({
      title: next,
      content: latestContentRef.current,
      plainText: latestPlainTextRef.current,
    });
  };

  const handleDuplicate = async () => {
    await flush();
    onDuplicate();
  };

  const handleRefine = async (mode: RefineMode, tone?: RefineTone) => {
    if (!editor || refining) return;

    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, "\n", "\n");
    if (!selectedText.trim()) return;

    setRefining(true);

    try {
      const result = await refineNoteText({ text: selectedText, mode, tone });

      if (!result.ok) {
        toast.add({
          title: "AI Refine could not finish",
          description: result.error,
          type: "error",
        });
        return;
      }

      const docSize = editor.state.doc.content.size;
      const safeFrom = Math.min(from, docSize);
      const safeTo = Math.min(to, docSize);

      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: safeFrom, to: safeTo },
          refinedTextToContent(result.data.text),
        )
        .run();

      toast.add({
        title: "Selection refined",
        description: tone
          ? `${REFINE_MODE_LABELS[mode]} · ${REFINE_TONE_LABELS[tone]}`
          : REFINE_MODE_LABELS[mode],
        type: "success",
      });
    } catch (error) {
      console.error("AI Refine failed", error);
      toast.add({
        title: "AI Refine could not finish",
        description: "Something went wrong. Try again in a moment.",
        type: "error",
      });
    } finally {
      setRefining(false);
    }
  };

  const wordCount = useMemo(() => countWords(plainText), [plainText]);
  const tone = categoryTones[note.color];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 pt-3 md:pt-4">
        <div className="mx-auto flex w-full max-w-3xl items-start gap-2 px-4 md:px-8">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onOpenList}
            aria-label="Open notes list"
            title="Notes list"
            className="mt-1 shrink-0 text-muted-foreground lg:hidden"
          >
            <PanelLeft />
          </Button>

          <div className="min-w-0 flex-1">
            <textarea
              ref={titleRef}
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  editor?.commands.focus("end");
                }
              }}
              rows={1}
              maxLength={NOTE_TITLE_MAX_LENGTH}
              placeholder="Untitled note"
              aria-label="Note title"
              spellCheck={false}
              className="block w-full resize-none overflow-hidden bg-transparent font-heading text-xl leading-tight font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 md:text-2xl"
            />

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1">
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
                  aria-hidden="true"
                />
                <span className="truncate">
                  Edited <RelativeTime value={lastSavedAt} />
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {wordCount} word{wordCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span
                aria-live="polite"
                title={saveError ?? undefined}
                className={cn(
                  "inline-flex items-center gap-1",
                  saveState === "error" && "text-destructive",
                )}
              >
                {saveState === "saving" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : saveState === "error" ? (
                  <CircleAlert className="size-3" />
                ) : saveState === "unsaved" ? (
                  <Cloud className="size-3" />
                ) : (
                  <CheckCircle2 className="size-3" />
                )}
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "error"
                    ? "Not saved"
                    : saveState === "unsaved"
                      ? "Unsaved changes"
                      : "Saved"}
              </span>
            </div>
          </div>

          <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void toggleVoice()}
              disabled={voiceStatus === "stopping"}
              aria-label={
                isRecording
                  ? "Stop recording"
                  : voiceStatus === "connecting"
                    ? "Cancel connecting"
                    : "Speak to Note"
              }
              aria-pressed={isRecording}
              title={
                isRecording
                  ? "Stop recording"
                  : voiceStatus === "connecting"
                    ? "Cancel connecting"
                    : "Speak to Note"
              }
              className={cn(
                "h-7 gap-1.5 rounded-full border px-2 text-[11px] font-medium",
                isRecording
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
                voiceStatus === "connecting" &&
                  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              {voiceStatus === "connecting" || voiceStatus === "stopping" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isRecording ? (
                <span className="relative flex size-3.5 items-center justify-center">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500/40" />
                  <Mic className="relative size-3.5 animate-pulse" />
                </span>
              ) : (
                <Mic className="size-3.5" />
              )}
              <span className="hidden md:inline">
                {voiceStatus === "connecting"
                  ? "Cancel"
                  : voiceStatus === "stopping"
                    ? "Finishing…"
                    : isRecording
                      ? "Stop"
                      : "Speak to Note"}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onTogglePin}
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
              aria-pressed={note.pinned}
              title={note.pinned ? "Unpin note" : "Pin note"}
              className={cn(
                "text-muted-foreground",
                note.pinned && "text-primary",
              )}
            >
              <Pin
                className="size-4"
                fill={note.pinned ? "currentColor" : "none"}
              />
            </Button>

            <NoteColorPopover color={note.color} onChange={onColor} />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Note options"
                    title="Note options"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => void handleDuplicate()}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    void flush();
                    onDelete();
                  }}
                >
                  <Trash2 />
                  Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {editor ? <NoteEditorToolbar editor={editor} /> : null}

      {voiceActive ? (
        <div className="shrink-0">
          <div className="mx-auto w-full max-w-3xl px-4 pt-2 md:px-8">
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-1.5 text-xs">
              <span
                className="relative flex size-2 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <span
                  className={cn(
                    "absolute inline-flex size-2 rounded-full",
                    voiceStatus === "recording"
                      ? "animate-ping bg-rose-500/50"
                      : "bg-amber-500/40",
                  )}
                />
                <span
                  className={cn(
                    "relative size-1.5 rounded-full",
                    voiceStatus === "recording"
                      ? "bg-rose-500"
                      : "bg-amber-500",
                  )}
                />
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className="font-medium text-foreground/80"
                  aria-live="polite"
                >
                  {voiceStatus === "connecting"
                    ? "Connecting to AssemblyAI…"
                    : voiceStatus === "stopping"
                      ? "Finishing last words…"
                      : "Listening…"}
                </p>
                <p className="truncate text-muted-foreground" aria-live="off">
                  {partialTranscript ||
                    (voiceStatus === "connecting"
                      ? "Allow microphone access if your browser asks."
                      : voiceStatus === "stopping"
                        ? "Saving the last finalized phrase…"
                        : "Start speaking — finalized phrases appear in your note.")}
                </p>
              </div>

              {voiceStatus === "recording" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => void stopVoice()}
                  aria-label="Stop recording"
                  className="shrink-0 gap-1 rounded-full text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                >
                  <Square className="size-2.5 fill-current" />
                  Stop
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-8 md:pb-14 md:pt-8">
          <EditorContent editor={editor} />
        </div>
      </div>

      {editor ? (
        <NoteBubbleMenu
          editor={editor}
          refining={refining}
          onRefine={(mode, refineTone) => {
            void handleRefine(mode, refineTone);
          }}
        />
      ) : null}
    </div>
  );
}
