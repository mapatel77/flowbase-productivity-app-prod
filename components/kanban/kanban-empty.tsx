"use client";

import { Plus, Sparkles, SquareKanban } from "lucide-react";

import { Button } from "@/components/ui/button";

type KanbanEmptyProps = {
  onCreateBoard: () => void;
};

export function KanbanEmpty({ onCreateBoard }: KanbanEmptyProps) {
  return (
    <section className="cozy-card flex min-h-[24rem] flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
        <SquareKanban className="size-7" strokeWidth={1.9} />
      </span>

      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          A calm place for every task
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          Create your first board to start moving work across Todo, In Progress
          and Done.
        </p>
      </div>

      <Button
        onClick={onCreateBoard}
        className="gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-sm hover:from-sky-600 hover:to-violet-600"
      >
        <Plus className="size-4" />
        Create a board
      </Button>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3.5 text-amber-500 dark:text-amber-400" />
        Boards start with three thoughtful columns.
      </p>
    </section>
  );
}
