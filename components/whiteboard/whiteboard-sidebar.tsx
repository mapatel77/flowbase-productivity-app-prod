"use client";

import { MoreHorizontal, Pencil, Plus, Presentation, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RelativeTime } from "@/components/notes/relative-time";
import { categoryTones } from "@/lib/calendar/colors";
import type { Whiteboard } from "@/lib/whiteboard/types";
import { cn } from "@/lib/utils";

type WhiteboardSidebarProps = {
  whiteboards: Whiteboard[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onRename: (board: Whiteboard) => void;
  onDelete: (board: Whiteboard) => void;
  busy?: boolean;
  className?: string;
};

export function WhiteboardSidebar({
  whiteboards,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  busy = false,
  className,
}: WhiteboardSidebarProps) {
  return (
    <aside className={cn("flex h-full min-h-0 flex-col p-3 lg:pr-4", className)}>
      <div className="shrink-0 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold tracking-tight">
              <Presentation className="size-3.5 text-emerald-500" />
              Whiteboards
            </h2>
            <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground">
              {whiteboards.length === 0
                ? "No whiteboards yet"
                : `${whiteboards.length} whiteboard${whiteboards.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreate}
            disabled={busy}
            className="-mr-1 h-8 gap-1 rounded-full px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="size-3.5" />
            New whiteboard
          </Button>
        </div>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {whiteboards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Presentation className="size-[18px]" />
            </span>
            <p className="text-[11px] font-medium text-muted-foreground">
              Create your first whiteboard
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              Sketch ideas, drop sticky notes and diagram with AI.
            </p>
          </div>
        ) : (
          whiteboards.map((board) => {
            const tone = categoryTones[board.color];
            const selected = board.id === activeId;

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
                    className={cn("size-2.5 shrink-0 rounded-full", tone.dot)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {board.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      <RelativeTime value={board.updatedAt} />
                    </span>
                  </span>
                </button>

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
                    <DropdownMenuItem onClick={() => onRename(board)}>
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(board)}
                    >
                      <Trash2 />
                      Delete whiteboard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>

      <Button
        variant="outline"
        onClick={onCreate}
        disabled={busy}
        className="mt-3 w-full gap-1.5 rounded-xl bg-card/70"
      >
        <Plus className="size-4" />
        New whiteboard
      </Button>
    </aside>
  );
}
