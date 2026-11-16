"use client";

import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CheckCircle2,
  CircleAlert,
  Cloud,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { refinePageText, savePageContent } from "@/app/pages/actions";
import { RelativeTime } from "@/components/notes/relative-time";
import {
  usePageAutosave,
  type PageSnapshot,
} from "@/components/pages/use-page-autosave";
import { EditorBubbleMenu } from "@/components/shared/editor-bubble-menu";
import { EditorToolbar } from "@/components/shared/editor-toolbar";
import { SlashCommand } from "@/components/shared/slash-command";
import { VoiceButton } from "@/components/shared/voice-button";
import { VoiceTranscript } from "@/components/shared/voice-transcript";
import { toast } from "@/components/ui/toast";
import { useAssemblyAIStreaming } from "@/hooks/use-assemblyai-streaming";
import { PAGE_TITLE_MAX_LENGTH } from "@/lib/pages/constants";
import { extractPageText } from "@/lib/pages/content";
import type {
  RefineMode,
  RefineTone,
} from "@/lib/notes/types";
import type {
  PageDocument,
  PageSaveResult,
  SpacePage,
} from "@/lib/pages/types";
import { cn } from "@/lib/utils";

/**
 * Gemini returns plain text. A single-line result can be inserted as an inline
 * text node; multi-line results become paragraphs so the document stays valid.
 */
function refinedTextToContent(text: string) {
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

type PageEditorProps = {
  page: SpacePage;
  autoFocusTitle?: boolean;
  onSaved: (result: PageSaveResult) => void;
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
};

/** The rich text editor used for the body of a page. */
export function PageEditor({
  page,
  autoFocusTitle = false,
  onSaved,
  registerFlush,
}: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [wordCount, setWordCount] = useState(0);
  const [refining, setRefining] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleValueRef = useRef(page.title);
  const latestContentRef = useRef<PageDocument>(page.content);

  const saveSnapshot = useCallback(
    (snapshot: PageSnapshot) =>
      savePageContent({
        id: page.id,
        title: snapshot.title,
        content: snapshot.content,
      }),
    [page.id],
  );

  const {
    markDirty,
    flush,
    state: saveState,
    lastSavedAt,
    error: saveError,
  } = usePageAutosave({
    initialUpdatedAt: page.updatedAt,
    save: saveSnapshot,
    onSaved: (result) => onSaved(result),
  });

  const editor = useEditor({
    immediatelyRender: false,
    content: page.content,
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
        class: "editor-prose min-h-[52vh] focus:outline-none",
        "aria-label": "Page body",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      const content = current.getJSON();
      latestContentRef.current = content;

      const text = extractPageText(content);
      setWordCount(text.split(/\s+/).filter(Boolean).length);

      markDirty({
        title: titleValueRef.current,
        content,
        plainText: text,
      });
    },
  });

  useEffect(() => {
    if (!registerFlush) return;
    registerFlush(flush);
    return () => registerFlush(null);
  }, [flush, registerFlush]);

  // Keep the title in sync when it is renamed outside the editor.
  useEffect(() => {
    if (titleRef.current && document.activeElement === titleRef.current) return;
    if (page.title === titleValueRef.current) return;

    titleValueRef.current = page.title;
    setTitle(page.title);
  }, [page.title]);

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
    const next = value.slice(0, PAGE_TITLE_MAX_LENGTH);
    titleValueRef.current = next;
    setTitle(next);

    markDirty({
      title: next,
      content: latestContentRef.current,
      plainText: extractPageText(latestContentRef.current),
    });
  };

  /* ── voice ────────────────────────────────────────────────────────────── */

  const insertTranscript = useCallback(
    (raw: string) => {
      const current = editor;
      if (!current || current.isDestroyed) return;

      const text = raw.replace(/\s+/g, " ").trim();
      if (!text) return;

      const { doc, selection } = current.state;
      const hasCursor = current.isFocused;
      let position = hasCursor
        ? Math.min(
            Math.max(selection.to, 0),
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
          previousCharacter && !/\s/.test(previousCharacter)
            ? ` ${text}`
            : text;

        return {
          node: { type: "text", text: spokenText },
          length: spokenText.length,
        };
      };

      try {
        if (hasCursor) {
          const { node, length } = buildContent(position);
          current.chain().insertContentAt(position, node).run();
          position += length;
        } else {
          // No active cursor: append to the end of the page instead.
          current.chain().focus("end").run();
          const { node } = buildContent(current.state.selection.to);
          current.chain().insertContent(node).run();
        }
      } catch (insertError) {
        console.error("Could not insert the voice transcript", insertError);
        return;
      }

      // `onUpdate` marks the page dirty; flush so spoken text is persisted
      // right away instead of waiting for the next debounce window.
      void flush();
    },
    [editor, flush],
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
        title: "Voice",
        description: message,
        type: "error",
      });
    },
  });

  /* ── AI refine ────────────────────────────────────────────────────────── */

  const handleRefine = async (mode: RefineMode, tone?: RefineTone) => {
    if (!editor || refining) return;

    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, "\n", "\n");
    if (!selectedText.trim()) return;

    setRefining(true);

    try {
      const result = await refinePageText({
        pageId: page.id,
        text: selectedText,
        mode,
        tone,
      });

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
        description:
          tone === undefined
            ? undefined
            : `${tone.charAt(0).toUpperCase()}${tone.slice(1)} tone`,
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

  return (
    <div className="flex min-h-0 flex-col">
      <header className="shrink-0 pt-3 md:pt-4">
        <div className="mx-auto flex w-full max-w-3xl items-start gap-2 px-4 md:px-8">
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
              maxLength={PAGE_TITLE_MAX_LENGTH}
              placeholder="Untitled page"
              aria-label="Page title"
              spellCheck={false}
              className="block w-full resize-none overflow-hidden bg-transparent font-heading text-xl leading-tight font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 md:text-2xl"
            />

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>Edited <RelativeTime value={lastSavedAt} /></span>
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
            <VoiceButton
              status={voiceStatus}
              isRecording={isRecording}
              onToggle={() => void toggleVoice()}
              label="Voice"
            />
          </div>
        </div>
      </header>

      {editor ? <EditorToolbar editor={editor} label="Page formatting" /> : null}

      {voiceActive ? (
        <div className="shrink-0">
          <VoiceTranscript
            status={voiceStatus}
            partialTranscript={partialTranscript}
            placeholder="Start speaking — finalized phrases appear in your page."
            onStop={() => void stopVoice()}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-8 md:pb-14 md:pt-8">
          <EditorContent editor={editor} />
        </div>
      </div>

      {editor ? (
        <EditorBubbleMenu
          editor={editor}
          refining={refining}
          onRefine={(mode, tone) => void handleRefine(mode, tone)}
        />
      ) : null}
    </div>
  );
}
