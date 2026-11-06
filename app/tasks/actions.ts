"use server";

import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  calendarEntries,
  kanbanBoardMembers,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  users,
} from "@/db/schema";
import { isDateKey, toDateKey } from "@/lib/calendar/dates";
import type { ColorToken } from "@/lib/calendar/colors";
import { isColorToken } from "@/lib/calendar/colors";
import {
  resolveCurrentUserProfile,
  type CurrentUserProfile,
} from "@/lib/calendar/user";
import {
  activatePendingBoardInvites,
  canEditBoard,
  getAccessibleBoardRoles,
  getBoardAccess,
  isBoardOwner,
} from "@/lib/kanban/access";
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
  KanbanBoardRole,
  KanbanCollaborator,
  KanbanColumn,
  KanbanData,
  KanbanLabel,
  KanbanPriority,
  KanbanTask,
  KanbanViewer,
  TaskMutationResult,
} from "@/lib/kanban/types";
import { KANBAN_PRIORITIES } from "@/lib/kanban/types";
import { deleteBoardRoom, deleteTaskThreads } from "@/lib/liveblocks/server";
import { getUserColor, getUserDisplayName } from "@/lib/liveblocks/user-color";

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

function normalizeMemberRole(role: string | null | undefined): KanbanBoardRole {
  return role === "viewer" ? "viewer" : "editor";
}

function toBoard(
  row: typeof kanbanBoards.$inferSelect,
  accessRole: KanbanBoardRole = "owner",
): KanbanBoard {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : "sky",
    accessRole,
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

function toViewer(profile: CurrentUserProfile): KanbanViewer {
  return {
    id: profile.id,
    name: getUserDisplayName(profile.name, profile.email),
    email: profile.email,
    color: getUserColor(profile.email),
  };
}

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Kanban action failed", error);
  return { ok: false, error: message };
}

/* ── queries ───────────────────────────────────────────────────────────── */

/**
 * Loads every board, column and task the current user can access. A board's
 * columns and tasks are shared in full, so row ownership no longer scopes the
 * read — board membership does.
 */
export async function getKanbanData(): Promise<ActionResult<KanbanData>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const viewer = toViewer(profile);
    const roles = await getAccessibleBoardRoles(profile);
    const boardIds = [...roles.keys()];

    if (boardIds.length === 0) {
      return {
        ok: true,
        data: { viewer, boards: [], columns: [], tasks: [] },
      };
    }

    const [boardRows, columnRows, taskRows] = await Promise.all([
      db
        .select()
        .from(kanbanBoards)
        .where(inArray(kanbanBoards.id, boardIds))
        .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id)),
      db
        .select()
        .from(kanbanColumns)
        .where(inArray(kanbanColumns.boardId, boardIds))
        .orderBy(
          asc(kanbanColumns.boardId),
          asc(kanbanColumns.position),
          asc(kanbanColumns.id),
        ),
      db
        .select()
        .from(kanbanTasks)
        .where(inArray(kanbanTasks.boardId, boardIds))
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
        viewer,
        boards: boardRows.map((row) =>
          toBoard(row, roles.get(row.id) ?? "editor"),
        ),
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the board a name." };

    const color = isColorToken(input.color) ? input.color : "sky";

    const [boardRow] = await db
      .insert(kanbanBoards)
      .values({ userId: profile.id, name, color })
      .returning();

    try {
      const columnRows = await db
        .insert(kanbanColumns)
        .values(
          DEFAULT_COLUMNS.map((columnName, position) => ({
            boardId: boardRow.id,
            userId: profile.id,
            name: columnName,
            position,
          })),
        )
        .returning();

      revalidatePath("/tasks");

      return {
        ok: true,
        data: {
          board: toBoard(boardRow, "owner"),
          columns: columnRows
            .map(toColumn)
            .sort((a, b) => a.position - b.position || a.id - b.id),
        },
      };
    } catch (error) {
      // Do not leave a half-created board behind if seeding failed.
      await db.delete(kanbanBoards).where(eq(kanbanBoards.id, boardRow.id));
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const access = await getBoardAccess(profile, input.id);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!isBoardOwner(access.role)) {
      return { ok: false, error: "Only the board owner can edit its details." };
    }

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
      .where(eq(kanbanBoards.id, input.id))
      .returning();

    if (!row) return { ok: false, error: "That board no longer exists." };

    revalidatePath("/tasks");
    return { ok: true, data: toBoard(row, access.role) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteBoard(input: {
  id: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const access = await getBoardAccess(profile, input.id);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!isBoardOwner(access.role)) {
      return { ok: false, error: "Only the board owner can delete this board." };
    }

    const linkedTasks = await db
      .select({ calendarEntryId: kanbanTasks.calendarEntryId })
      .from(kanbanTasks)
      .where(
        and(
          eq(kanbanTasks.boardId, input.id),
          isNotNull(kanbanTasks.calendarEntryId),
        ),
      );

    const calendarEntryIds = linkedTasks
      .map((task) => task.calendarEntryId)
      .filter((id): id is number => typeof id === "number");

    if (calendarEntryIds.length > 0) {
      await db
        .delete(calendarEntries)
        .where(inArray(calendarEntries.id, calendarEntryIds));
    }

    await db.delete(kanbanBoards).where(eq(kanbanBoards.id, input.id));
    await deleteBoardRoom(input.id);

    revalidatePath("/tasks");
    revalidatePath("/calendar");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    return fail(error);
  }
}

/* ── sharing ───────────────────────────────────────────────────────────── */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Shares a board with an email address. Known accounts become active members
 * immediately; unknown emails stay pending until that person signs in.
 */
export async function inviteBoardMember(input: {
  boardId: number;
  email: string;
}): Promise<ActionResult<KanbanCollaborator>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const access = await getBoardAccess(profile, input.boardId);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!isBoardOwner(access.role)) {
      return { ok: false, error: "Only the board owner can invite people." };
    }

    const email = normalizeEmail(input.email);
    if (!EMAIL_PATTERN.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }

    const [owner] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, access.board.userId))
      .limit(1);

    if (owner && owner.email.trim().toLowerCase() === email) {
      return { ok: false, error: "You already own this board." };
    }

    const [existingUser] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const [existingMember] = await db
      .select({ id: kanbanBoardMembers.id })
      .from(kanbanBoardMembers)
      .where(
        and(
          eq(kanbanBoardMembers.boardId, input.boardId),
          eq(kanbanBoardMembers.email, email),
        ),
      )
      .limit(1);

    if (existingMember) {
      return {
        ok: false,
        error: "That person can already access this board.",
      };
    }

    const [row] = await db
      .insert(kanbanBoardMembers)
      .values({
        boardId: input.boardId,
        userId: existingUser?.id ?? null,
        email,
        role: "editor",
      })
      .returning();

    revalidatePath("/tasks");

    return {
      ok: true,
      data: {
        id: row.id,
        userId: row.userId,
        name: getUserDisplayName(existingUser?.name, email),
        email,
        role: normalizeMemberRole(row.role),
        status: row.userId ? "active" : "pending",
        color: getUserColor(email),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function removeBoardMember(input: {
  boardId: number;
  memberId: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const access = await getBoardAccess(profile, input.boardId);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!isBoardOwner(access.role)) {
      return { ok: false, error: "Only the board owner can remove people." };
    }

    const [member] = await db
      .select({ id: kanbanBoardMembers.id })
      .from(kanbanBoardMembers)
      .where(
        and(
          eq(kanbanBoardMembers.id, input.memberId),
          eq(kanbanBoardMembers.boardId, input.boardId),
        ),
      )
      .limit(1);

    if (!member) return { ok: false, error: "That collaborator was not found." };

    await db
      .delete(kanbanBoardMembers)
      .where(eq(kanbanBoardMembers.id, input.memberId));

    revalidatePath("/tasks");
    return { ok: true, data: { id: input.memberId } };
  } catch (error) {
    return fail(error);
  }
}

/** Lists the owner and every active or pending collaborator on a board. */
export async function getBoardCollaborators(input: {
  boardId: number;
}): Promise<ActionResult<KanbanCollaborator[]>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    await activatePendingBoardInvites(profile);

    const access = await getBoardAccess(profile, input.boardId);
    if (!access) return { ok: false, error: "That board no longer exists." };

    const [ownerRows, memberRows] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, access.board.userId))
        .limit(1),
      db
        .select({
          id: kanbanBoardMembers.id,
          userId: kanbanBoardMembers.userId,
          email: kanbanBoardMembers.email,
          role: kanbanBoardMembers.role,
          userName: users.name,
        })
        .from(kanbanBoardMembers)
        .leftJoin(users, eq(users.id, kanbanBoardMembers.userId))
        .where(eq(kanbanBoardMembers.boardId, input.boardId))
        .orderBy(asc(kanbanBoardMembers.createdAt), asc(kanbanBoardMembers.id)),
    ]);

    const owner = ownerRows[0];
    const collaborators: KanbanCollaborator[] = [];

    if (owner) {
      collaborators.push({
        id: null,
        userId: owner.id,
        name: getUserDisplayName(owner.name, owner.email),
        email: owner.email,
        role: "owner",
        status: "active",
        color: getUserColor(owner.email),
      });
    }

    for (const member of memberRows) {
      collaborators.push({
        id: member.id,
        userId: member.userId,
        name: getUserDisplayName(member.userName, member.email),
        email: member.email,
        role: normalizeMemberRole(member.role),
        status: member.userId ? "active" : "pending",
        color: getUserColor(member.email),
      });
    }

    return { ok: true, data: collaborators };
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const access = await getBoardAccess(profile, input.boardId);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

    const existing = await db
      .select({ position: kanbanColumns.position })
      .from(kanbanColumns)
      .where(eq(kanbanColumns.boardId, input.boardId))
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
        userId: profile.id,
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const [column] = await db
      .select({ boardId: kanbanColumns.boardId })
      .from(kanbanColumns)
      .where(eq(kanbanColumns.id, input.id))
      .limit(1);

    if (!column) return { ok: false, error: "That column no longer exists." };

    const access = await getBoardAccess(profile, column.boardId);
    if (!access) return { ok: false, error: "That column no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Give the column a name." };

    const [row] = await db
      .update(kanbanColumns)
      .set({ name })
      .where(eq(kanbanColumns.id, input.id))
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const [column] = await db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.id, input.id))
      .limit(1);

    if (!column) return { ok: false, error: "That column no longer exists." };

    const access = await getBoardAccess(profile, column.boardId);
    if (!access) return { ok: false, error: "That column no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

    const boardColumns = await db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.boardId, column.boardId))
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
      .where(eq(kanbanTasks.columnId, column.id))
      .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.id));

    const targetTail = await db
      .select({ position: kanbanTasks.position })
      .from(kanbanTasks)
      .where(eq(kanbanTasks.columnId, target.id))
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
        .where(eq(kanbanTasks.id, task.id))
        .returning();

      if (row) movedTasks.push(toTask(row));
    }

    await db.delete(kanbanColumns).where(eq(kanbanColumns.id, column.id));

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
  task: KanbanTask,
  entryId: number,
): Promise<KanbanTask> {
  const [row] = await db
    .update(kanbanTasks)
    .set({ calendarEntryId: entryId, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, task.id))
    .returning();

  return row ? toTask(row) : task;
}

async function nextTaskPosition(columnId: number): Promise<number> {
  const tail = await db
    .select({ position: kanbanTasks.position })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId))
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const [column] = await db
      .select({ id: kanbanColumns.id, boardId: kanbanColumns.boardId })
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.id, input.columnId),
          eq(kanbanColumns.boardId, input.boardId),
        ),
      )
      .limit(1);

    if (!column) return { ok: false, error: "That column no longer exists." };

    const access = await getBoardAccess(profile, input.boardId);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
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
        userId: profile.id,
        title,
        description: input.description?.trim() || null,
        dueDate,
        priority: isPriority(input.priority) ? input.priority : "medium",
        labels: normalizeLabels(input.labels),
        position: await nextTaskPosition(input.columnId),
        notesLinked: input.notesLinked ?? false,
      })
      .returning();

    let task = toTask(row);
    let syncError: string | undefined;

    if (input.syncCalendar) {
      try {
        const entryId = await createCalendarEntryForTask(profile.id, task);

        if (entryId) {
          task = await linkTaskToCalendarEntry(task, entryId);
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const [existing] = await db
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.id, input.id))
      .limit(1);

    if (!existing) return { ok: false, error: "That task no longer exists." };

    const access = await getBoardAccess(profile, existing.boardId);
    if (!access) return { ok: false, error: "That task no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

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
      .where(eq(kanbanTasks.id, input.id))
      .returning();

    let task = toTask(row);
    let syncError: string | undefined;
    const canManageCalendar = existing.userId === profile.id;

    if (input.syncCalendar !== undefined && !canManageCalendar) {
      syncError =
        "Only the task creator can change its Calendar sync. The task itself was saved.";
    } else if (canManageCalendar) {
      if (input.syncCalendar === false) {
        if (task.calendarEntryId) {
          try {
            await deleteCalendarEntry(task.userId, task.calendarEntryId);

            const [unlinked] = await db
              .update(kanbanTasks)
              .set({ calendarEntryId: null, updatedAt: new Date() })
              .where(eq(kanbanTasks.id, task.id))
              .returning();

            if (unlinked) task = toTask(unlinked);
          } catch (error) {
            console.error("Failed to remove a Kanban Calendar link", error);
            syncError =
              "The task was saved, but Calendar sync could not be removed.";
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
                  eq(calendarEntries.userId, task.userId),
                ),
              )
              .returning({ id: calendarEntries.id });

            if (!entry) {
              const entryId = await createCalendarEntryForTask(
                task.userId,
                task,
              );
              if (entryId) {
                task = await linkTaskToCalendarEntry(task, entryId);
              } else {
                syncError = "The task was saved, but Calendar sync failed.";
              }
            }
          } else {
            const entryId = await createCalendarEntryForTask(
              task.userId,
              task,
            );
            if (entryId) {
              task = await linkTaskToCalendarEntry(task, entryId);
            } else {
              syncError = "The task was saved, but Calendar sync failed.";
            }
          }
        } catch (error) {
          console.error("Failed to update a Kanban Calendar link", error);
          syncError = "The task was saved, but Calendar sync failed.";
        }
      }
    }

    revalidatePath("/tasks");
    if (
      canManageCalendar &&
      (input.syncCalendar !== undefined || task.calendarEntryId)
    ) {
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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const [task] = await db
      .select({
        id: kanbanTasks.id,
        boardId: kanbanTasks.boardId,
        userId: kanbanTasks.userId,
        calendarEntryId: kanbanTasks.calendarEntryId,
      })
      .from(kanbanTasks)
      .where(eq(kanbanTasks.id, input.id))
      .limit(1);

    if (!task) return { ok: false, error: "That task no longer exists." };

    const access = await getBoardAccess(profile, task.boardId);
    if (!access) return { ok: false, error: "That task no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

    if (task.calendarEntryId) {
      await deleteCalendarEntry(task.userId, task.calendarEntryId);
    }

    await db.delete(kanbanTasks).where(eq(kanbanTasks.id, input.id));
    await deleteTaskThreads(task.boardId, task.id);

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
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const [task] = await db
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.id, input.id))
      .limit(1);

    if (!task) return { ok: false, error: "That task no longer exists." };

    const access = await getBoardAccess(profile, task.boardId);
    if (!access) return { ok: false, error: "That task no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

    if (task.columnId === input.columnId) {
      return { ok: true, data: toTask(task) };
    }

    const [column] = await db
      .select({ id: kanbanColumns.id })
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.id, input.columnId),
          eq(kanbanColumns.boardId, task.boardId),
        ),
      )
      .limit(1);

    if (!column) return { ok: false, error: "That column no longer exists." };

    const [row] = await db
      .update(kanbanTasks)
      .set({
        columnId: input.columnId,
        position: await nextTaskPosition(input.columnId),
        updatedAt: new Date(),
      })
      .where(eq(kanbanTasks.id, input.id))
      .returning();

    if (!row) return { ok: false, error: "That task no longer exists." };

    revalidatePath("/tasks");
    return { ok: true, data: toTask(row) };
  } catch (error) {
    return fail(error);
  }
}
