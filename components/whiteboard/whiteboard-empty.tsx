"use client";

import { Presentation } from "lucide-react";

import { Button } from "@/components/ui/button";

type WhiteboardEmptyProps = {
  busy?: boolean;
  onCreate: () => void;
};

export function WhiteboardEmpty({ busy = false, onCreate }: WhiteboardEmptyProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-emerald-500/80 dark:text-emerald-300/80">
        <Presentation className="size-10" strokeWidth={1.5} />
      </span>

      <div className="max-w-sm">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          A calm place to think out loud
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Create a whiteboard to sketch ideas, drop in sticky notes and diagram
          flows together with AI.
        </p>
      </div>

      <Button
        onClick={onCreate}
        disabled={busy}
        className="gap-1.5 rounded-lg"
      >
        Create your first whiteboard
      </Button>
    </div>
  );
}
