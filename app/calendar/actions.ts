"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { calendarCategories, calendarEntries } from "@/db/schema";
import type { ColorToken } from "@/lib/calendar/colors";
import { isColorToken } from "@/lib/calendar/colors";
import { normalizeTime } from "@/lib/calendar/dates";
import type {
  ActionResult,
  CalendarCategory,
  CalendarEntry,
  EntryKind,
} from "@/lib/calendar/types";
import { ENTRY_KINDS } from "@/lib/calendar/types";
import { resolveCurrentUserId } from "@/lib/calendar/user";

const DEFAULT_CATEGORIES: Array<{ name: string; color: ColorToken }> = [
  { name: "Work", color: "sky" },
  { name: "Personal", color: "violet" },
  { name: "Health", color: "emerald" },
  { name: "Learning", color: "amber" },
];

function toCategory(row: typeof calendarCategories.$inferSelect): CalendarCategory {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : "sky",
    createdAt: row.createdAt,
  };
}

function toEntry(row: typeof calendarEntries.$inferSelect): CalendarEntry {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    notes: row.notes,
    kind: row.kind === "reminder" ? "reminder" : "task",
    categoryId: row.categoryId,
    scheduledDate: row.scheduledDate,
    scheduledTime: normalizeTime(row.scheduledTime),
    done: row.done,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Calendar action failed", error);
  return { ok: false, error: message };
}

function isEntryKind(value: unknown): value is EntryKind {
  return typeof value === "string" && (ENTRY_KINDS as readonly string[]).includes(value);
}

/**
 * Gives a brand new user a handful of starter categories. Existing users keep
 * whatever they have set up.
 */
async function ensureDefaultCategories(
  userId: number,
): Promise<CalendarCategory[]> {
  const existing = await db
    .select()
    .from(calendarCategories)
    .where(eq(calendarCategories.userId, userId))
    .orderBy(asc(calendarCategories.name));

  if (existing.length > 0) return existing.map(toCategory);

  await db
    .insert(calendarCategories)
    .values(DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })))
    .onConflictDoNothing();

  const seeded = await db
    .select()
    .from(calendarCategories)
    .where(eq(calendarCategories.userId, userId))
    .orderBy(asc(calendarCategories.name));

  return seeded.map(toCategory);
}

/** Loads every category and entry that belongs to the current user. */
export async function getCalendarData(): Promise<
  ActionResult<{ categories: CalendarCategory[]; entries: CalendarEntry[] }>
> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const [categories, entryRows] = await Promise.all([
      ensureDefaultCategories(userId),
      db
        .select()
        .from(calendarEntries)
        .where(eq(calendarEntries.userId, userId))
        .orderBy(asc(calendarEntries.scheduledDate), asc(calendarEntries.id)),
    ]);

    return {
      ok: true,
      data: {
        categories,
        entries: entryRows.map(toEntry),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function createCategory(input: {
  name: string;
  color: ColorToken;
}): Promise<ActionResult<CalendarCategory>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the category a name." };

    const [row] = await db
      .insert(calendarCategories)
      .values({ userId, name, color: input.color })
      .returning();

    revalidatePath("/calendar");
    return { ok: true, data: toCategory(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function updateCategory(input: {
  id: number;
  name: string;
  color: ColorToken;
}): Promise<ActionResult<CalendarCategory>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the category a name." };

    const [row] = await db
      .update(calendarCategories)
      .set({ name, color: input.color })
      .where(
        and(
          eq(calendarCategories.id, input.id),
          eq(calendarCategories.userId, userId),
        ),
      )
      .returning();

    if (!row) return { ok: false, error: "That category no longer exists." };

    revalidatePath("/calendar");
    return { ok: true, data: toCategory(row) };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Deletes a category. Entries keep their content — the category reference is
 * cleared by the database (`onDelete: "set null"`).
 */
export async function deleteCategory(input: {
  id: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const deleted = await db
      .delete(calendarCategories)
      .where(
        and(
          eq(calendarCategories.id, input.id),
          eq(calendarCategories.userId, userId),
        ),
      )
      .returning({ id: calendarCategories.id });

    if (deleted.length === 0) {
      return { ok: false, error: "That category no longer exists." };
    }

    revalidatePath("/calendar");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    return fail(error);
  }
}

export type EntryInput = {
  title: string;
  notes?: string | null;
  kind: EntryKind;
  categoryId?: number | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
};

export async function createEntry(input: EntryInput): Promise<ActionResult<CalendarEntry>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the task a title." };

    const [row] = await db
      .insert(calendarEntries)
      .values({
        userId,
        title,
        notes: input.notes?.trim() || null,
        kind: isEntryKind(input.kind) ? input.kind : "task",
        categoryId: input.categoryId ?? null,
        scheduledDate: input.scheduledDate ?? null,
        scheduledTime: input.scheduledTime ?? null,
      })
      .returning();

    revalidatePath("/calendar");
    return { ok: true, data: toEntry(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function updateEntry(input: {
  id: number;
  patch: Partial<EntryInput>;
}): Promise<ActionResult<CalendarEntry>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const patch = input.patch;
    const values: Partial<typeof calendarEntries.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) return { ok: false, error: "Give the task a title." };
      values.title = title;
    }
    if (patch.notes !== undefined) {
      values.notes = patch.notes?.trim() || null;
    }
    if (patch.kind !== undefined && isEntryKind(patch.kind)) {
      values.kind = patch.kind;
    }
    if (patch.categoryId !== undefined) {
      values.categoryId = patch.categoryId ?? null;
    }
    if (patch.scheduledDate !== undefined) {
      values.scheduledDate = patch.scheduledDate ?? null;
    }
    if (patch.scheduledTime !== undefined) {
      values.scheduledTime = patch.scheduledTime ?? null;
    }

    const [row] = await db
      .update(calendarEntries)
      .set(values)
      .where(
        and(
          eq(calendarEntries.id, input.id),
          eq(calendarEntries.userId, userId),
        ),
      )
      .returning();

    if (!row) return { ok: false, error: "That task no longer exists." };

    revalidatePath("/calendar");
    return { ok: true, data: toEntry(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteEntry(input: {
  id: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const deleted = await db
      .delete(calendarEntries)
      .where(
        and(eq(calendarEntries.id, input.id), eq(calendarEntries.userId, userId)),
      )
      .returning({ id: calendarEntries.id });

    if (deleted.length === 0) {
      return { ok: false, error: "That task no longer exists." };
    }

    revalidatePath("/calendar");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleEntryDone(input: {
  id: number;
  done: boolean;
}): Promise<ActionResult<CalendarEntry>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const [row] = await db
      .update(calendarEntries)
      .set({ done: input.done, updatedAt: new Date() })
      .where(
        and(eq(calendarEntries.id, input.id), eq(calendarEntries.userId, userId)),
      )
      .returning();

    if (!row) return { ok: false, error: "That task no longer exists." };

    revalidatePath("/calendar");
    return { ok: true, data: toEntry(row) };
  } catch (error) {
    return fail(error);
  }
}

/**
 * The single endpoint behind drag & drop: moving a task to another date, or
 * dropping it back into the Draft Task Panel (`scheduledDate: null`).
 */
export async function moveEntry(input: {
  id: number;
  scheduledDate: string | null;
}): Promise<ActionResult<CalendarEntry>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const [row] = await db
      .update(calendarEntries)
      .set({ scheduledDate: input.scheduledDate, updatedAt: new Date() })
      .where(
        and(eq(calendarEntries.id, input.id), eq(calendarEntries.userId, userId)),
      )
      .returning();

    if (!row) return { ok: false, error: "That task no longer exists." };

    revalidatePath("/calendar");
    return { ok: true, data: toEntry(row) };
  } catch (error) {
    return fail(error);
  }
}

/** Counts the entries that are still waiting in the draft panel. */
export async function countDrafts(): Promise<ActionResult<number>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const rows = await db
      .select({ id: calendarEntries.id })
      .from(calendarEntries)
      .where(
        and(
          eq(calendarEntries.userId, userId),
          isNull(calendarEntries.scheduledDate),
        ),
      );

    return { ok: true, data: rows.length };
  } catch (error) {
    return fail(error);
  }
}
