import { format, isPast, isToday, parseISO } from "date-fns";

import { categoryTones } from "@/lib/calendar/colors";
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
} from "@/lib/kanban/types";

export type FocusTask = {
  id: number;
  title: string;
  /** The board the task belongs to. */
  project: string;
  /** Short label for the due date or priority. */
  due: string;
  dueState: "today" | "overdue" | "later" | "none";
  /** Tailwind dot colour taken from the board colour. */
  tone: string;
  done: boolean;
  /** The column a task is moved into when it is ticked off. */
  doneColumnId: number | null;
  /** The column a task is moved back into when it is unticked. */
  todoColumnId: number | null;
};

/** Column names that mean “this task is finished”. */
const DONE_COLUMN_NAMES = new Set(["done", "complete", "completed"]);

function boardTone(board: KanbanBoard | undefined): string {
  return categoryTones[board?.color ?? "sky"].dot;
}

function dueLabel(task: KanbanTask): {
  label: string;
  state: FocusTask["dueState"];
} {
  if (!task.dueDate) {
    return {
      label: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
      state: "none",
    };
  }

  const date = parseISO(task.dueDate);

  if (isToday(date)) return { label: "Today", state: "today" };
  if (isPast(date)) return { label: "Overdue", state: "overdue" };

  return { label: format(date, "MMM d"), state: "later" };
}

/**
 * Flattens the Kanban boards into the short list the dashboard shows.
 *
 * A task counts as done when it sits in a column called “Done” — or, when the
 * board has no such column, in its last column.
 */
export function buildFocusTasks(
  boards: KanbanBoard[],
  columns: KanbanColumn[],
  tasks: KanbanTask[],
  limit = 6,
): FocusTask[] {
  const boardById = new Map(boards.map((board) => [board.id, board]));
  const columnsByBoard = new Map<number, KanbanColumn[]>();

  for (const column of columns) {
    const list = columnsByBoard.get(column.boardId) ?? [];
    list.push(column);
    columnsByBoard.set(column.boardId, list);
  }

  const result: FocusTask[] = [];

  for (const task of tasks) {
    const boardColumns = (columnsByBoard.get(task.boardId) ?? []).sort(
      (a, b) => a.position - b.position,
    );

    const doneColumn =
      boardColumns.find((column) =>
        DONE_COLUMN_NAMES.has(column.name.trim().toLowerCase()),
      ) ?? boardColumns[boardColumns.length - 1];
    const todoColumn = boardColumns[0];

    const board = boardById.get(task.boardId);
    const due = dueLabel(task);

    result.push({
      id: task.id,
      title: task.title,
      project: board?.name ?? "Board",
      due: due.label,
      dueState: due.state,
      tone: boardTone(board),
      done: doneColumn ? task.columnId === doneColumn.id : false,
      doneColumnId: doneColumn?.id ?? null,
      todoColumnId: todoColumn?.id ?? null,
    });
  }

  // Unfinished work first, then the tasks closest to their due date.
  return result
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const rank = { today: 0, overdue: 0, later: 1, none: 2 };
      return rank[a.dueState] - rank[b.dueState];
    })
    .slice(0, limit);
}

/** How many unfinished tasks are due today. */
export function countTasksDueToday(
  boards: KanbanBoard[],
  columns: KanbanColumn[],
  tasks: KanbanTask[],
): number {
  const focusTasks = buildFocusTasks(boards, columns, tasks, tasks.length);

  return focusTasks.filter((task) => !task.done && task.dueState === "today")
    .length;
}
