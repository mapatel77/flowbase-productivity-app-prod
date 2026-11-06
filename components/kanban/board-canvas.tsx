"use client";

import type { ReactNode } from "react";
import { Columns3, SquareKanban } from "lucide-react";

import { BoardColumn } from "@/components/kanban/column";
import { Button } from "@/components/ui/button";
import { categoryTones } from "@/lib/calendar/colors";
import { MAX_COLUMNS } from "@/lib/kanban/constants";
import type {
  KanbanBoard,
  KanbanColumn as KanbanColumnRecord,
  KanbanTask,
} from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

type BoardCanvasProps = {
  board: KanbanBoard;
  columns: KanbanColumnRecord[];
  tasks: KanbanTask[];
  topBarActions?: ReactNode;
  canEdit?: boolean;
  commentCounts?: Record<number, number>;
  onAddColumn: () => void;
  onEditColumn: (column: KanbanColumnRecord) => void;
  onDeleteColumn: (column: KanbanColumnRecord) => void;
  onAddTask: (columnId: number) => void;
  onOpenTask: (task: KanbanTask) => void;
  onDeleteTask: (task: KanbanTask) => void;
  onOpenComments?: (task: KanbanTask) => void;
};

export function BoardCanvas({
  board,
  columns,
  tasks,
  topBarActions,
  canEdit = true,
  commentCounts,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onAddTask,
  onOpenTask,
  onDeleteTask,
  onOpenComments,
}: BoardCanvasProps) {
  const tone = categoryTones[board.color];
  const atColumnLimit = columns.length >= MAX_COLUMNS;

  return (
    <section className="cozy-card flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              tone.chip,
            )}
          >
            <SquareKanban className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-semibold tracking-tight">
              {board.name}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {columns.length} of {MAX_COLUMNS} columns · {tasks.length} task
              {tasks.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {topBarActions}

          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddColumn}
              disabled={atColumnLimit}
              title={
                atColumnLimit
                  ? `A board can have up to ${MAX_COLUMNS} columns`
                  : "Add a column"
              }
              className="h-8 gap-1.5 rounded-lg bg-card/70"
            >
              <Columns3 className="size-3.5" />
              Add column
            </Button>
          ) : null}
        </div>
      </div>

      {canEdit && atColumnLimit ? (
        <p className="text-[11px] text-muted-foreground">
          You have reached the {MAX_COLUMNS}-column limit for this board.
        </p>
      ) : null}

      <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={tasks
              .filter((task) => task.columnId === column.id)
              .sort(
                (a, b) => a.position - b.position || a.id - b.id,
              )}
            canEdit={canEdit}
            commentCounts={commentCounts}
            onAddTask={onAddTask}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onOpenTask={onOpenTask}
            onDeleteTask={onDeleteTask}
            onOpenComments={onOpenComments}
          />
        ))}

        {columns.length === 0 ? (
          <div className="flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <Columns3 className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">This board has no columns</p>
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddColumn}
                className="mt-1 gap-1.5 rounded-lg bg-card/70"
              >
                <Columns3 className="size-3.5" />
                Add a column
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
