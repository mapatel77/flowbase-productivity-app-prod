"use server";

import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  calendarEntries,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
} from "@/db/schema";
import { isDateKey, toDateKey } from "@/lib/calendar/dates";
import type { ColorToken } from "@/lib/calendar/colors";
import { isColorToken } from "@/lib/calendar/colors";
import { resolveCurrentUserId } from "@/lib/calendar/user";
import {
  DEFAULT_COLUMNS,
  MAX_COLUMNS,
  MAX_LABEL_LENGTH,
  MAX_TASK_LABELS,
} from "@/lib/kanban/constants";
import type {
  ActionResult,
  BoardCreateResult,
  ColumnDeleteResult,
  KanbanBoard,
  KanbanColumn,
  KanbanData,
  KanbanLabel,
  KanbanPriority,
  KanbanTask,
  TaskMutationResult,
} from "@/lib/kanban/types";
import { KANBAN_PRIORITIES } from "@/lib/kanban/types";

/* ── normalisation ─────────────────────────────────────────────────────── */

function isPriority(value: unknown): value is KanbanPriority {
  return (
    typeof value === "string" &&
    (KANBAN_PRIORITIES as readonly string[]).includes(value)
  );
}

function normalizeLabels(value: unknown): KanbanLabel[] {
  if (!Array.isArray(value)) return [];

  const labels: KanbanLabel[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as { name?: unknown; color?: unknown };
    if (typeof record.name !== "string") continue;

    const name = record.name.trim().slice(0, MAX_LABEL_LENGTH);
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    labels.push({
      name,
      color: isColorToken(record.color) ? record.color : "sky",
    });

    if (labels.length >= MAX_TASK_LABELS) break;
  }

  return labels;
}

function toBoard(row: typeof kanbanBoards.$inferSelect): KanbanBoard {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : "sky",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toColumn(row: typeof kanbanColumns.$inferSelect): KanbanColumn {
  return {
    id: row.id,
    boardId: row.boardId,
    userId: row.userId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt,
  };
}

function toTask(row: typeof kanbanTasks.$inferSelect): KanbanTask {
  return {
    id: row.id,
    boardId: row.boardId,
    columnId: row.columnId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    priority: isPriority(row.priority) ? row.priority : "medium",
    labels: normalizeLabels(row.labels),
    position: row.position,
    calendarEntryId: row.calendarEntryId,
    notesLinked: row.notesLinked,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Kanban action failed", error);
  return { ok: false, error: message };
}

/* ── queries ───────────────────────────────────────────────────────────── */

/** Loads every board, column and task that belongs to the current user. */
export async function getKanbanData(): Promise<ActionResult<KanbanData>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const [boardRows, columnRows, taskRows] = await Promise.all([
      db
        .select()
        .from(kanbanBoards)
        .where(eq(kanbanBoards.userId, userId))
        .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id)),
      db
        .select()
        .from(kanbanColumns)
        .where(eq(kanbanColumns.userId, userId))
        .orderBy(
          asc(kanbanColumns.boardId),
          asc(kanbanColumns.position),
          asc(kanbanColumns.id),
        ),
      db
        .select()
        .from(kanbanTasks)
        .where(eq(kanbanTasks.userId, userId))
        .orderBy(
          asc(kanbanTasks.boardId),
          asc(kanbanTasks.columnId),
          asc(kanbanTasks.position),
          asc(kanbanTasks.id),
        ),
    ]);

    return {
      ok: true,
      data: {
        boards: boardRows.map(toBoard),
        columns: columnRows.map(toColumn),
        tasks: taskRows.map(toTask),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/* ── boards ────────────────────────────────────────────────────────────── */

export async function createBoard(input: {
  name: string;
  color: ColorToken;
}): Promise<ActionResult<BoardCreateResult>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the board a name." };

    const color = isColorToken(input.color) ? input.color : "sky";

    const [boardRow] = await db
      .insert(kanbanBoards)
      .values({ userId, name, color })
      .returning();

    try {
      const columnRows = await db
        .insert(kanbanColumns)
        .values(
          DEFAULT_COLUMNS.map((columnName, position) => ({
            boardId: boardRow.id,
            userId,
            name: columnName,
            position,
          })),
        )
        .returning();

      revalidatePath("/tasks");

      return {
        ok: true,
        data: {
          board: toBoard(boardRow),
          columns: columnRows
            .map(toColumn)
            .sort((a, b) => a.position - b.position || a.id - b.id),
        },
      };
    } catch (error) {
      // Do not leave a half-created board behind if seeding failed.
      await db
        .delete(kanbanBoards)
        .where(
          and(eq(kanbanBoards.id, boardRow.id), eq(kanbanBoards.userId, userId)),
        );
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
}

export async function updateBoard(input: {
  id: number;
  name?: string;
  color?: ColorToken;
}): Promise<ActionResult<KanbanBoard>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const values: Partial<typeof kanbanBoards.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return { ok: false, error: "Give the board a name." };
      values.name = name;
    }

    if (input.color !== undefined) {
      if (!isColorToken(input.color)) {
        return { ok: false, error: "Choose a valid board colour." };
      }
      values.color = input.color;
    }

    const [row] = await db
      .update(kanbanBoards)
      .set(values)
      .where(
        and(eq(kanbanBoards.id, input.id), eq(kanbanBoards.userId, userId)),
      )
      .returning();

    if (!row) return { ok: false, error: "That board no longer exists." };

    revalidatePath("/tasks");
    return { ok: true, data: toBoard(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteBoard(input: {
  id: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const boardRows = await db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(
        and(eq(kanbanBoards.id, input.id), eq(kanbanBoards.userId, userId)),
      )
      .limit(1);

    if (!boardRows[0]) {
      return { ok: false, error: "That board no longer exists." };
    }

    const linkedTasks = await db
      .select({ calendarEntryId: kanbanTasks.calendarEntryId })
      .from(kanbanTasks)
      .where(
        and(
          eq(kanbanTasks.boardId, input.id),
          eq(kanbanTasks.userId, userId),
          isNotNull(kanbanTasks.calendarEntryId),
        ),
      );

    const calendarEntryIds = linkedTasks
      .map((task) => task.calendarEntryId)
      .filter((id): id is number => typeof id === "number");

    if (calendarEntryIds.length > 0) {
      await db
        .delete(calendarEntries)
        .where(
          and(
            eq(calendarEntries.userId, userId),
            inArray(calendarEntries.id, calendarEntryIds),
          ),
        );
    }

    await db
      .delete(kanbanBoards)
      .where(
        and(eq(kanbanBoards.id, input.id), eq(kanbanBoards.userId, userId)),
      );

    revalidatePath("/tasks");
    revalidatePath("/calendar");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    return fail(error);
  }
}

/* ── columns ───────────────────────────────────────────────────────────── */

export async function createColumn(input: {
  boardId: number;
  name: string;
}): Promise<ActionResult<KanbanColumn>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const boardRows = await db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(
        and(
          eq(kanbanBoards.id, input.boardId),
          eq(kanbanBoards.userId, userId),
        ),
      )
      .limit(1);

    if (!boardRows[0]) {
      return { ok: false, error: "That board no longer exists." };
    }

    const existing = await db
      .select({ position: kanbanColumns.position })
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.boardId, input.boardId),
          eq(kanbanColumns.userId, userId),
        ),
      )
      .orderBy(desc(kanbanColumns.position));

    if (existing.length >= MAX_COLUMNS) {
      return {
        ok: false,
        error: `A board can have up to ${MAX_COLUMNS} columns.`,
      };
    }

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the column a name." };

    const [row] = await db
      .insert(kanbanColumns)
      .values({
        boardId: input.boardId,
        userId,
        name,
        position: (existing[0]?.position ?? -1) + 1,
      })
      .returning();

    revalidatePath("/tasks");
    return { ok: true, data: toColumn(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function updateColumn(input: {
  id: number;
  name: string;
}): Promise<ActionResult<KanbanColumn>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the column a name." };

    const [row] = await db
      .update(kanbanColumns)
      .set({ name })
      .where(
        and(eq(kanbanColumns.id, input.id), eq(kanbanColumns.userId, userId)),
      )
      .returning();

    if (!row) return { ok: false, error: "That column no longer exists." };

    revalidatePath("/tasks");
    return { ok: true, data: toColumn(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteColumn(input: {
  id: number;
}): Promise<ActionResult<ColumnDeleteResult>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const columnRows = await db
      .select()
      .from(kanbanColumns)
      .where(
        and(eq(kanbanColumns.id, input.id), eq(kanbanColumns.userId, userId)),
      )
      .limit(1);

    const column = columnRows[0];
    if (!column) return { ok: false, error: "That column no longer exists." };

    const boardColumns = await db
      .select()
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.boardId, column.boardId),
          eq(kanbanColumns.userId, userId),
        ),
      )
      .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));

    if (boardColumns.length <= 1) {
      return {
        ok: false,
        error: "A board needs at least one column.",
      };
    }

    const target = boardColumns.find((item) => item.id !== column.id);
    if (!target) {
      return { ok: false, error: "Could not find a column for these tasks." };
    }

    const tasksToMove = await db
      .select()
      .from(kanbanTasks)
      .where(
        and(
          eq(kanbanTasks.columnId, column.id),
          eq(kanbanTasks.userId, userId),
        ),
      )
      .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.id));

    const targetTail = await db
      .select({ position: kanbanTasks.position })
      .from(kanbanTasks)
      .where(
        and(
          eq(kanbanTasks.columnId, target.id),
          eq(kanbanTasks.userId, userId),
        ),
      )
      .orderBy(desc(kanbanTasks.position))
      .limit(1);

    const startPosition = (targetTail[0]?.position ?? -1) + 1;
    const movedTasks: KanbanTask[] = [];

    for (const [index, task] of tasksToMove.entries()) {
      const [row] = await db
        .update(kanbanTasks)
        .set({
          columnId: target.id,
          position: startPosition + index,
          updatedAt: new Date(),
        })
        .where(
          and(eq(kanbanTasks.id, task.id), eq(kanbanTasks.userId, userId)),
        )
        .returning();

      if (row) movedTasks.push(toTask(row));
    }

    await db
      .delete(kanbanColumns)
      .where(
        and(eq(kanbanColumns.id, column.id), eq(kanbanColumns.userId, userId)),
      );

    revalidatePath("/tasks");
    return {
      ok: true,
      data: {
        id: column.id,
        targetColumnId: target.id,
        movedTasks,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/* ── tasks ─────────────────────────────────────────────────────────────── */

async function createCalendarEntryForTask(
  userId: number,
  task: KanbanTask,
): Promise<number | null> {
  const [row] = await db
    .insert(calendarEntries)
    .values({
      userId,
      title: task.title,
      notes: task.description,
      kind: "task",
      scheduledDate: task.dueDate,
      done: false,
    })
    .returning({ id: calendarEntries.id });

  return row?.id ?? null;
}

async function deleteCalendarEntry(userId: number, entryId: number) {
  await db
    .delete(calendarEntries)
    .where(
      and(eq(calendarEntries.id, entryId), eq(calendarEntries.userId, userId)),
    );
}

async function linkTaskToCalendarEntry(
  userId: number,
  task: KanbanTask,
  entryId: number,
): Promise<KanbanTask> {
  const [row] = await db
    .update(kanbanTasks)
    .set({ calendarEntryId: entryId, updatedAt: new Date() })
    .where(and(eq(kanbanTasks.id, task.id), eq(kanbanTasks.userId, userId)))
    .returning();

  return row ? toTask(row) : task;
}

async function nextTaskPosition(
  userId: number,
  columnId: number,
): Promise<number> {
  const tail = await db
    .select({ position: kanbanTasks.position })
    .from(kanbanTasks)
    .where(
      and(eq(kanbanTasks.userId, userId), eq(kanbanTasks.columnId, columnId)),
    )
    .orderBy(desc(kanbanTasks.position))
    .limit(1);

  return (tail[0]?.position ?? -1) + 1;
}

export type CreateTaskInput = {
  boardId: number;
  columnId: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: KanbanPriority;
  labels?: KanbanLabel[];
  syncCalendar?: boolean;
  notesLinked?: boolean;
};

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<TaskMutationResult>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const columnRows = await db
      .select({ id: kanbanColumns.id })
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.id, input.columnId),
          eq(kanbanColumns.boardId, input.boardId),
          eq(kanbanColumns.userId, userId),
        ),
      )
      .limit(1);

    if (!columnRows[0]) {
      return { ok: false, error: "That column no longer exists." };
    }

    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the task a title." };

    const dueDate =
      input.dueDate === null || input.dueDate === undefined
        ? null
        : isDateKey(input.dueDate)
          ? input.dueDate
          : toDateKey(new Date());

    const [row] = await db
      .insert(kanbanTasks)
      .values({
        boardId: input.boardId,
        columnId: input.columnId,
        userId,
        title,
        description: input.description?.trim() || null,
        dueDate,
        priority: isPriority(input.priority) ? input.priority : "medium",
        labels: normalizeLabels(input.labels),
        position: await nextTaskPosition(userId, input.columnId),
        notesLinked: input.notesLinked ?? false,
      })
      .returning();

    let task = toTask(row);
    let syncError: string | undefined;

    if (input.syncCalendar) {
      try {
        const entryId = await createCalendarEntryForTask(userId, task);

        if (entryId) {
          task = await linkTaskToCalendarEntry(userId, task, entryId);
        } else {
          syncError = "The task was saved, but Calendar sync failed.";
        }
      } catch (error) {
        console.error("Failed to sync a Kanban task to Calendar", error);
        syncError = "The task was saved, but Calendar sync failed.";
      }
    }

    revalidatePath("/tasks");
    if (input.syncCalendar) revalidatePath("/calendar");

    return { ok: true, data: { task, syncError } };
  } catch (error) {
    return fail(error);
  }
}

export type UpdateTaskInput = {
  id: number;
  patch: {
    title?: string;
    description?: string | null;
    dueDate?: string | null;
    priority?: KanbanPriority;
    labels?: KanbanLabel[];
    notesLinked?: boolean;
  };
  /** `true` creates/keeps a Calendar entry, `false` removes it. */
  syncCalendar?: boolean;
};

export async function updateTask(
  input: UpdateTaskInput,
): Promise<ActionResult<TaskMutationResult>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const existingRows = await db
      .select()
      .from(kanbanTasks)
      .where(
        and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.userId, userId)),
      )
      .limit(1);

    const existing = existingRows[0];
    if (!existing) return { ok: false, error: "That task no longer exists." };

    const patch = input.patch;
    const values: Partial<typeof kanbanTasks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) return { ok: false, error: "Give the task a title." };
      values.title = title;
    }

    if (patch.description !== undefined) {
      values.description = patch.description?.trim() || null;
    }

    if (patch.dueDate !== undefined) {
      if (patch.dueDate === null) {
        values.dueDate = null;
      } else if (isDateKey(patch.dueDate)) {
        values.dueDate = patch.dueDate;
      } else {
        return { ok: false, error: "Choose a valid due date." };
      }
    }

    if (patch.priority !== undefined) {
      if (!isPriority(patch.priority)) {
        return { ok: false, error: "Choose a valid priority." };
      }
      values.priority = patch.priority;
    }

    if (patch.labels !== undefined) {
      values.labels = normalizeLabels(patch.labels);
    }

    if (patch.notesLinked !== undefined) {
      values.notesLinked = patch.notesLinked;
    }

    const [row] = await db
      .update(kanbanTasks)
      .set(values)
      .where(
        and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.userId, userId)),
      )
      .returning();

    let task = toTask(row);
    let syncError: string | undefined;

    if (input.syncCalendar === false) {
      if (task.calendarEntryId) {
        try {
          await deleteCalendarEntry(userId, task.calendarEntryId);

          const [unlinked] = await db
            .update(kanbanTasks)
            .set({ calendarEntryId: null, updatedAt: new Date() })
            .where(
              and(eq(kanbanTasks.id, task.id), eq(kanbanTasks.userId, userId)),
            )
            .returning();

          if (unlinked) task = toTask(unlinked);
        } catch (error) {
          console.error("Failed to remove a Kanban Calendar link", error);
          syncError = "The task was saved, but Calendar sync could not be removed.";
        }
      }
    } else if (input.syncCalendar === true || task.calendarEntryId) {
      try {
        if (task.calendarEntryId) {
          const [entry] = await db
            .update(calendarEntries)
            .set({
              title: task.title,
              notes: task.description,
              scheduledDate: task.dueDate,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(calendarEntries.id, task.calendarEntryId),
                eq(calendarEntries.userId, userId),
              ),
            )
            .returning({ id: calendarEntries.id });

          if (!entry) {
            const entryId = await createCalendarEntryForTask(userId, task);
            if (entryId) {
              task = await linkTaskToCalendarEntry(userId, task, entryId);
            } else {
              syncError = "The task was saved, but Calendar sync failed.";
            }
          }
        } else {
          const entryId = await createCalendarEntryForTask(userId, task);
          if (entryId) {
            task = await linkTaskToCalendarEntry(userId, task, entryId);
          } else {
            syncError = "The task was saved, but Calendar sync failed.";
          }
        }
      } catch (error) {
        console.error("Failed to update a Kanban Calendar link", error);
        syncError = "The task was saved, but Calendar sync failed.";
      }
    }

    revalidatePath("/tasks");
    if (input.syncCalendar !== undefined || task.calendarEntryId) {
      revalidatePath("/calendar");
    }

    return { ok: true, data: { task, syncError } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTask(input: {
  id: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const taskRows = await db
      .select({
        id: kanbanTasks.id,
        calendarEntryId: kanbanTasks.calendarEntryId,
      })
      .from(kanbanTasks)
      .where(
        and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.userId, userId)),
      )
      .limit(1);

    const task = taskRows[0];
    if (!task) return { ok: false, error: "That task no longer exists." };

    if (task.calendarEntryId) {
      await deleteCalendarEntry(userId, task.calendarEntryId);
    }

    await db
      .delete(kanbanTasks)
      .where(
        and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.userId, userId)),
      );

    revalidatePath("/tasks");
    revalidatePath("/calendar");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function moveTask(input: {
  id: number;
  columnId: number;
}): Promise<ActionResult<KanbanTask>> {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) return { ok: false, error: "No user found." };

    const taskRows = await db
      .select()
      .from(kanbanTasks)
      .where(
        and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.userId, userId)),
      )
      .limit(1);

    const task = taskRows[0];
    if (!task) return { ok: false, error: "That task no longer exists." };

    if (task.columnId === input.columnId) {
      return { ok: true, data: toTask(task) };
    }

    const columnRows = await db
      .select({ id: kanbanColumns.id })
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.id, input.columnId),
          eq(kanbanColumns.boardId, task.boardId),
          eq(kanbanColumns.userId, userId),
        ),
      )
      .limit(1);

    if (!columnRows[0]) {
      return { ok: false, error: "That column no longer exists." };
    }

    const [row] = await db
      .update(kanbanTasks)
      .set({
        columnId: input.columnId,
        position: await nextTaskPosition(userId, input.columnId),
        updatedAt: new Date(),
      })
      .where(
        and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.userId, userId)),
      )
      .returning();

    if (!row) return { ok: false, error: "That task no longer exists." };

    revalidatePath("/tasks");
    return { ok: true, data: toTask(row) };
  } catch (error) {
    return fail(error);
  }
}
