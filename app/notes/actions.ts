"use server";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notes } from "@/db/schema";
import { isColorToken, type ColorToken } from "@/lib/calendar/colors";
import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import {
  AiRefineError,
  refineTextWithGemini,
} from "@/lib/notes/ai";
import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_TITLE,
  NOTE_SELECTION_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
} from "@/lib/notes/constants";
import {
  createEmptyNoteContent,
  extractPlainText,
  isNoteDocument,
  normalizeNoteContent,
  normalizeNoteTitle,
  noteTitle,
} from "@/lib/notes/content";
import {
  REFINE_MODES,
  REFINE_TONES,
  type ActionResult,
  type Note,
  type NoteSaveResult,
  type RefineMode,
  type RefineTone,
} from "@/lib/notes/types";

const MAX_CONTENT_BYTES = 2_000_000;

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Notes action failed", error);
  return { ok: false, error: message };
}

function toNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    color: isColorToken(row.color) ? row.color : DEFAULT_NOTE_COLOR,
    content: normalizeNoteContent(row.content),
    plainText: row.plainText,
    pinned: row.pinned,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireUserId() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    throw new Error("No workspace user could be found.");
  }
  return profile.id;
}

/* ── reads ─────────────────────────────────────────────────────────────── */

export async function getNotesData(): Promise<ActionResult<Note[]>> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id));

    return { ok: true, data: rows.map(toNote) };
  } catch (error) {
    return fail(error);
  }
}

/* ── creation ──────────────────────────────────────────────────────────── */

export async function createNote(): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .insert(notes)
      .values({
        userId,
        title: DEFAULT_NOTE_TITLE,
        color: DEFAULT_NOTE_COLOR,
        content: createEmptyNoteContent(),
        plainText: "",
      })
      .returning();

    if (!row) return { ok: false, error: "The note could not be created." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateNote(id: number): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();

    const [original] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);

    if (!original) return { ok: false, error: "That note no longer exists." };

    const copyTitle = `${noteTitle(original.title)} (copy)`.slice(
      0,
      NOTE_TITLE_MAX_LENGTH,
    );

    const content = normalizeNoteContent(original.content);

    const [row] = await db
      .insert(notes)
      .values({
        userId,
        title: copyTitle,
        color: original.color,
        content,
        plainText: extractPlainText(content),
        pinned: false,
      })
      .returning();

    if (!row) return { ok: false, error: "The note could not be duplicated." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

/* ── editor autosave ───────────────────────────────────────────────────── */

export async function saveNote(input: {
  id: number;
  title: string;
  content: unknown;
}): Promise<ActionResult<NoteSaveResult>> {
  try {
    const userId = await requireUserId();

    if (!isNoteDocument(input.content)) {
      return { ok: false, error: "The note content was not valid." };
    }

    let contentSize = 0;
    try {
      contentSize = JSON.stringify(input.content).length;
    } catch {
      return { ok: false, error: "The note content was not valid." };
    }

    if (contentSize > MAX_CONTENT_BYTES) {
      return { ok: false, error: "This note is too large to save." };
    }

    const title = normalizeNoteTitle(input.title ?? "");
    // Always derive search text on the server. Client metadata can go stale or
    // differ from the saved document, especially around formatted inline text.
    const plainText = extractPlainText(input.content).slice(0, 50_000);

    const [row] = await db
      .update(notes)
      .set({
        title,
        content: input.content,
        plainText,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, input.id), eq(notes.userId, userId)))
      .returning({
        updatedAt: notes.updatedAt,
        title: notes.title,
        plainText: notes.plainText,
      });

    if (!row) return { ok: false, error: "That note no longer exists." };

    // Deliberately no revalidatePath here: a router refresh while the user is
    // typing would be distracting. The page is dynamic, so the next visit still
    // reads the freshest row from Postgres.
    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

/* ── metadata mutations ────────────────────────────────────────────────── */

export async function renameNote(input: {
  id: number;
  title: string;
}): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();
    const title = noteTitle(input.title).slice(0, NOTE_TITLE_MAX_LENGTH);

    const [row] = await db
      .update(notes)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(notes.id, input.id), eq(notes.userId, userId)))
      .returning();

    if (!row) return { ok: false, error: "That note no longer exists." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function setNoteColor(input: {
  id: number;
  color: ColorToken;
}): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();

    if (!isColorToken(input.color)) {
      return { ok: false, error: "That colour is not available." };
    }

    const [row] = await db
      .update(notes)
      .set({ color: input.color })
      .where(and(eq(notes.id, input.id), eq(notes.userId, userId)))
      .returning();

    if (!row) return { ok: false, error: "That note no longer exists." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function setNotePinned(input: {
  id: number;
  pinned: boolean;
}): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .update(notes)
      .set({ pinned: input.pinned })
      .where(and(eq(notes.id, input.id), eq(notes.userId, userId)))
      .returning();

    if (!row) return { ok: false, error: "That note no longer exists." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

/* ── trash ─────────────────────────────────────────────────────────────── */

export async function softDeleteNote(id: number): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (!row) return { ok: false, error: "That note no longer exists." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function restoreNote(id: number): Promise<ActionResult<Note>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .update(notes)
      .set({ deletedAt: null })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (!row) return { ok: false, error: "That note no longer exists." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteNotePermanently(
  id: number,
): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .delete(notes)
      .where(
        and(
          eq(notes.id, id),
          eq(notes.userId, userId),
          isNotNull(notes.deletedAt),
        ),
      )
      .returning({ id: notes.id });

    if (!row) {
      return {
        ok: false,
        error: "Only notes already in Trash can be deleted permanently.",
      };
    }

    revalidatePath("/notes");
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function emptyTrash(): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .delete(notes)
      .where(and(eq(notes.userId, userId), isNotNull(notes.deletedAt)))
      .returning({ id: notes.id });

    revalidatePath("/notes");
    return { ok: true, data: { count: rows.length } };
  } catch (error) {
    return fail(error);
  }
}

/* ── AI refine ─────────────────────────────────────────────────────────── */

export async function refineNoteText(input: {
  text: string;
  mode: RefineMode;
  tone?: RefineTone;
}): Promise<ActionResult<{ text: string }>> {
  try {
    await requireUserId();

    const text = input.text.trim();
    if (!text) {
      return { ok: false, error: "Select some text first." };
    }
    if (text.length > NOTE_SELECTION_MAX_LENGTH) {
      return {
        ok: false,
        error: "That selection is too long for AI Refine. Select less text.",
      };
    }

    if (!(REFINE_MODES as readonly string[]).includes(input.mode)) {
      return { ok: false, error: "That AI Refine action is not available." };
    }

    const tone: RefineTone =
      input.tone && (REFINE_TONES as readonly string[]).includes(input.tone)
        ? input.tone
        : "professional";

    const refined = await refineTextWithGemini({
      text,
      mode: input.mode,
      tone,
    });

    return { ok: true, data: { text: refined } };
  } catch (error) {
    if (error instanceof AiRefineError) {
      return { ok: false, error: error.message };
    }
    return fail(error);
  }
}
