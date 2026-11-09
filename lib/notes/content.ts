import { DEFAULT_NOTE_TITLE, NOTE_TITLE_MAX_LENGTH } from "@/lib/notes/constants";
import type { NoteDocument } from "@/lib/notes/types";

/** A fresh, valid Tiptap document with one empty paragraph. */
export function createEmptyNoteContent(): NoteDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function isNoteDocument(value: unknown): value is NoteDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "doc"
  );
}

/** Guards against malformed JSON that may have been written to the database. */
export function normalizeNoteContent(value: unknown): NoteDocument {
  return isNoteDocument(value) ? value : createEmptyNoteContent();
}

/** The label shown in the note list and editor when a title is blank. */
export function noteTitle(title: string | null | undefined): string {
  return title?.trim() || DEFAULT_NOTE_TITLE;
}

/**
 * Titles are trimmed and capped. Unlike `noteTitle`, this can return an empty
 * string so the editor does not fight the user while they clear the field.
 */
export function normalizeNoteTitle(value: string): string {
  return value.trim().slice(0, NOTE_TITLE_MAX_LENGTH);
}

const BLOCK_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "horizontalRule",
]);

/** Pulls readable text out of a Tiptap JSON document for search. */
export function extractPlainText(content: NoteDocument): string {
  const parts: string[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    const current = node as {
      type?: unknown;
      text?: unknown;
      content?: unknown;
    };

    // Adjacent inline text nodes (for example a bold letter inside a word)
    // must join without a separator, or "test" becomes "t est".
    if (typeof current.text === "string") {
      parts.push(current.text);
      return;
    }

    if (current.type === "hardBreak") {
      parts.push(" ");
      return;
    }

    if (Array.isArray(current.content)) {
      current.content.forEach(visit);
    }

    // Separate block-level nodes with a space, then collapse the extras.
    if (
      typeof current.type === "string" &&
      BLOCK_NODE_TYPES.has(current.type)
    ) {
      parts.push(" ");
    }
  };

  visit(content);
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
