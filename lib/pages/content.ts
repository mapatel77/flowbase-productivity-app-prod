import {
  extractPlainText,
  isNoteDocument,
  normalizeNoteContent,
} from "@/lib/notes/content";
import { PAGE_TITLE_MAX_LENGTH } from "@/lib/pages/constants";
import type { PageDocument } from "@/lib/pages/types";

/** The label shown in the page list and editor when a title is blank. */
export const DEFAULT_PAGE_TITLE = "Untitled page";

/** A fresh, valid Tiptap document with one empty paragraph. */
export function createEmptyPageContent(): PageDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Whether a value is a Tiptap document we can render. */
export function isPageDocument(value: unknown): value is PageDocument {
  return isNoteDocument(value);
}

/** Guards against malformed JSON that may have been written to the database. */
export function normalizePageContent(value: unknown): PageDocument {
  return normalizeNoteContent(value);
}

/** Pulls readable text out of a page document for search. */
export function extractPageText(content: PageDocument): string {
  return extractPlainText(content);
}

/** The label shown in the page list and editor when a title is blank. */
export function pageTitle(title: string | null | undefined): string {
  return title?.trim() || DEFAULT_PAGE_TITLE;
}

/**
 * Titles are trimmed and capped. Unlike `pageTitle`, this can return an empty
 * string so the editor does not fight the user while they clear the field.
 */
export function normalizePageTitle(value: string): string {
  return value.trim().slice(0, PAGE_TITLE_MAX_LENGTH);
}
