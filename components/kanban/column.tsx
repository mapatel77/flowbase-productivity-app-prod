"use client";

import { useDroppable } from "@dnd-kit/core";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { TaskCard } from "@/components/kanban/task-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryTones } from "@/lib/calendar/colors";
import { COLUMN_COLOR_TOKENS } from "@/lib/kanban/constants";
import type {
  KanbanColumn as KanbanColumnRecord,
  KanbanTask,
} from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

type BoardColumnProps = {
  column: KanbanColumnRecord;
  tasks: KanbanTask[];
  onAddTask: (columnId: number) => void;
  onEditColumn: (column: KanbanColumnRecord) => void;
  onDeleteColumn: (column: KanbanColumnRecord) => void;
  onOpenTask: (task: KanbanTask) => void;
  onDeleteTask: (task: KanbanTask) => void;
};

export function BoardColumn({
  column,
  tasks,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onOpenTask,
  onDeleteTask,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { columnId: column.id },
  });

  const colorToken =
    COLUMN_COLOR_TOKENS[column.position % COLUMN_COLOR_TOKENS.length] ?? "sky";
  const tone = categoryTones[colorToken];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[18rem] max-w-[calc(100vw-3rem)] shrink-0 flex-col rounded-2xl border border-border/70 bg-muted/30 transition-colors lg:max-h-[calc(100svh-17rem)] lg:overflow-hidden",
        isOver && "border-primary/50 bg-accent/40",
      )}
    >
      <header className="flex items-start gap-1.5 p-3 pb-2">
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone.dot)} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-sm font-semibold tracking-tight">
            {column.name}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onAddTask(column.id)}
          aria-label={`Add task to ${column.name}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${column.name} options`}
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditColumn(column)}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteColumn(column)}
            >
              <Trash2 />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            columnName={column.name}
            onOpen={onOpenTask}
            onDelete={onDeleteTask}
          />
        ))}

        {tasks.length === 0 ? (
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 bg-card/30 p-3 text-center text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <Plus className="size-3.5" />
            <span>Drop tasks here or add one</span>
          </button>
        ) : null}
      </div>

      <div className="p-2 pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddTask(column.id)}
          className="w-full justify-start gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Add task
        </Button>
      </div>
    </section>
  );
}
