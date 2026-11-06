"use client";

import {
  MoreHorizontal,
  Pencil,
  Plus,
  SquareKanban,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryTones } from "@/lib/calendar/colors";
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
} from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

type BoardSidebarProps = {
  boards: KanbanBoard[];
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  activeBoardId: number | null;
  onSelect: (boardId: number) => void;
  onCreate: () => void;
  onEdit: (board: KanbanBoard) => void;
  onDelete: (board: KanbanBoard) => void;
  className?: string;
};

export function BoardSidebar({
  boards,
  columns,
  tasks,
  activeBoardId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  className,
}: BoardSidebarProps) {
  return (
    <aside className={cn("flex min-h-0 flex-col p-3", className)}>
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-semibold tracking-tight">
            Boards
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {boards.length === 0
              ? "No boards yet"
              : `${boards.length} board${boards.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreate}
          aria-label="Create a board"
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus />
        </Button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {boards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
              <SquareKanban className="size-[18px]" />
            </span>
            <p className="text-[11px] font-medium text-muted-foreground">
              Create your first board
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              Todo, In Progress and Done are ready for you.
            </p>
          </div>
        ) : (
          boards.map((board) => {
            const tone = categoryTones[board.color];
            const selected = board.id === activeBoardId;
            const isOwner = board.accessRole === "owner";
            const columnCount = columns.filter(
              (column) => column.boardId === board.id,
            ).length;
            const taskCount = tasks.filter(
              (task) => task.boardId === board.id,
            ).length;

            return (
              <div
                key={board.id}
                className={cn(
                  "group flex items-center gap-1 rounded-xl border border-transparent px-1.5 py-1.5 transition-colors",
                  selected
                    ? "bg-sidebar-accent/75 text-sidebar-accent-foreground ring-1 ring-primary/20"
                    : "hover:bg-muted/70",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(board.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      tone.dot,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {board.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {columnCount} column{columnCount === 1 ? "" : "s"} ·{" "}
                      {taskCount} task{taskCount === 1 ? "" : "s"}
                      {!isOwner ? " · shared" : ""}
                    </span>
                  </span>
                </button>

                {!isOwner ? (
                  <span
                    title="Shared with you"
                    className="flex size-6 shrink-0 items-center justify-center rounded-lg text-sky-600 dark:text-sky-300"
                  >
                    <Users className="size-3.5" />
                  </span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`${board.name} options`}
                          className="text-muted-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(board)}>
                        <Pencil />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(board)}
                      >
                        <Trash2 />
                        Delete board
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })
        )}
      </div>

      <Button
        variant="outline"
        onClick={onCreate}
        className="mt-3 w-full gap-1.5 rounded-xl bg-card/70"
      >
        <Plus className="size-4" />
        New board
      </Button>
    </aside>
  );
}
