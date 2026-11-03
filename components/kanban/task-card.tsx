"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  CalendarCheck,
  CalendarDays,
  Flag,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryTones } from "@/lib/calendar/colors";
import { formatDueDate, isDoneColumn, isOverdue } from "@/lib/kanban/dates";
import { PRIORITY_LABELS, PRIORITY_TONES } from "@/lib/kanban/constants";
import type { KanbanTask } from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

type TaskCardBodyProps = {
  task: KanbanTask;
  columnName: string;
  className?: string;
};

/** The visual part of a task card, reused by the drag overlay. */
export function TaskCardBody({
  task,
  columnName,
  className,
}: TaskCardBodyProps) {
  const priorityTone = PRIORITY_TONES[task.priority];
  const overdue =
    Boolean(task.dueDate) &&
    isOverdue(task.dueDate as string) &&
    !isDoneColumn(columnName);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_6%,transparent)] transition-all duration-200 group-hover/card:-translate-y-0.5 group-hover/card:border-border group-hover/card:shadow-[0_12px_24px_-16px_color-mix(in_oklch,var(--foreground)_45%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 size-1.5 shrink-0 rounded-full",
            priorityTone.dot,
          )}
        />
        <p className="min-w-0 flex-1 break-words text-[13px] leading-snug font-semibold">
          {task.title}
        </p>
        {task.calendarEntryId ? (
          <CalendarCheck
            className="mt-0.5 size-3.5 shrink-0 text-rose-500 dark:text-rose-400"
            aria-label="Synced with Calendar"
          />
        ) : null}
      </div>

      {task.description ? (
        <p className="line-clamp-2 break-words text-[11px] leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      {task.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label, index) => (
            <span
              key={`${label.name}-${index}`}
              className={cn(
                "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                categoryTones[label.color].chip,
              )}
            >
              <span className="truncate">{label.name}</span>
            </span>
          ))}
          {task.labels.length > 3 ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{task.labels.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            priorityTone.chip,
          )}
        >
          <Flag className="size-2.5" />
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              overdue
                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            <CalendarDays className="size-2.5" />
            {formatDueDate(task.dueDate)}
          </span>
        ) : null}

        {task.notesLinked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <NotebookPen className="size-2.5" />
            Notes
          </span>
        ) : null}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: KanbanTask;
  columnName: string;
  onOpen: (task: KanbanTask) => void;
  onDelete: (task: KanbanTask) => void;
};

/** A draggable task card. Clicking the card opens the edit dialog. */
export function TaskCard({
  task,
  columnName,
  onOpen,
  onDelete,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group/card relative touch-pan-y rounded-xl transition-opacity focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="block w-full cursor-grab touch-pan-y rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none active:cursor-grabbing"
      >
        <TaskCardBody task={task} columnName={columnName} className="pr-9" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute top-1.5 right-1.5 text-muted-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover/card:opacity-100 focus-visible:opacity-100"
              aria-label={`${task.title} options`}
              onPointerDown={(event) => event.stopPropagation()}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem onClick={() => onOpen(task)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
