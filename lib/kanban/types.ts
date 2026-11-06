import type { ColorToken } from "@/lib/calendar/colors";

export const KANBAN_PRIORITIES = ["low", "medium", "high"] as const;

export type KanbanPriority = (typeof KANBAN_PRIORITIES)[number];

/** A free-form task label with a palette colour token. */
export type KanbanLabel = {
  name: string;
  color: ColorToken;
};

/** How the current viewer can interact with a board. */
export const KANBAN_BOARD_ROLES = ["owner", "editor", "viewer"] as const;

export type KanbanBoardRole = (typeof KANBAN_BOARD_ROLES)[number];

/** The signed-in person viewing the Kanban page. */
export type KanbanViewer = {
  id: number;
  name: string;
  email: string;
  color: ColorToken;
};

/** A board member, including pending invites that have no account yet. */
export type KanbanCollaborator = {
  /** `null` for the owner entry; member row id for invited collaborators. */
  id: number | null;
  userId: number | null;
  name: string;
  email: string;
  role: KanbanBoardRole;
  status: "active" | "pending";
  color: ColorToken;
};

export type KanbanBoard = {
  id: number;
  userId: number;
  name: string;
  color: ColorToken;
  /** The current viewer's access level for this board. */
  accessRole: KanbanBoardRole;
  createdAt: Date;
  updatedAt: Date;
};

export type KanbanColumn = {
  id: number;
  boardId: number;
  userId: number;
  name: string;
  position: number;
  createdAt: Date;
};

export type KanbanTask = {
  id: number;
  boardId: number;
  columnId: number;
  userId: number;
  title: string;
  description: string | null;
  /** `yyyy-MM-dd`, or `null` when the task has no due date. */
  dueDate: string | null;
  priority: KanbanPriority;
  labels: KanbanLabel[];
  position: number;
  /** The matching Calendar entry, when sync is enabled. */
  calendarEntryId: number | null;
  notesLinked: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type KanbanData = {
  viewer: KanbanViewer;
  boards: KanbanBoard[];
  columns: KanbanColumn[];
  tasks: KanbanTask[];
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type TaskMutationResult = {
  task: KanbanTask;
  /** Set when the task saved but Calendar sync could not be completed. */
  syncError?: string;
};

export type ColumnDeleteResult = {
  id: number;
  targetColumnId: number;
  movedTasks: KanbanTask[];
};

export type BoardCreateResult = {
  board: KanbanBoard;
  columns: KanbanColumn[];
};
