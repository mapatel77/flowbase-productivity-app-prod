/**
 * Shared types for the Calendar page.
 *
 * The database rows are the source of truth, but the UI works with these
 * normalised shapes so components never have to deal with raw SQL strings.
 */

export const ENTRY_KINDS = ["task", "reminder"] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export type CalendarEntryRecord = {
  id: number;
  userId: number;
  title: string;
  notes: string | null;
  kind: EntryKind;
  categoryId: number | null;
  /** `yyyy-MM-dd`, or `null` when the entry is an unscheduled draft. */
  scheduledDate: string | null;
  /** `HH:mm`, or `null`. */
  scheduledTime: string | null;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CalendarCategoryRecord = {
  id: number;
  userId: number;
  name: string;
  color: ColorToken;
  createdAt: Date;
};

/** A category plus the resolved colour used everywhere in the UI. */
export type CalendarCategory = CalendarCategoryRecord;

export type CalendarEntry = CalendarEntryRecord;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

import type { ColorToken } from "./colors";

export type { ColorToken };
