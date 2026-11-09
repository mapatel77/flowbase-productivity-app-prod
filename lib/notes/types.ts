import type { JSONContent } from "@tiptap/core";

import type { ColorToken } from "@/lib/calendar/colors";

/** The JSON document persisted by Tiptap. */
export type NoteDocument = JSONContent;

/**
 * A single note page. `deletedAt` is the Trash marker: active notes always have
 * `deletedAt === null`, while Trash keeps the full document so it can be
 * restored without losing content.
 */
export type Note = {
  id: number;
  userId: number;
  title: string;
  color: ColorToken;
  content: NoteDocument;
  plainText: string;
  pinned: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteSaveResult = {
  updatedAt: Date;
  title: string;
  plainText: string;
};

export const REFINE_MODES = [
  "grammar",
  "rephrase",
  "shorter",
  "longer",
  "simplify",
  "tone",
] as const;

export type RefineMode = (typeof REFINE_MODES)[number];

export const REFINE_TONES = [
  "professional",
  "friendly",
  "casual",
  "confident",
] as const;

export type RefineTone = (typeof REFINE_TONES)[number];

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
