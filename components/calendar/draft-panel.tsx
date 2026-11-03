"use client";

import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";

import { EntryChip } from "@/components/calendar/entry-chip";
import { toneForEntry } from "@/lib/calendar/tone";
import type { CalendarCategory, CalendarEntry } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type DraftPanelProps = {
  drafts: CalendarEntry[];
  categoryById: Map<number, CalendarCategory>;
  onOpenEntry: (entry: CalendarEntry) => void;
  onAddDraft: () => void;
};

/**
 * The Draft Task Panel holds every task that has no date yet. Drafts can be
 * dragged onto any calendar day, and scheduled tasks can be dragged back here
 * to unschedule them.
 */
export function DraftPanel({
  drafts,
  categoryById,
  onOpenEntry,
  onAddDraft,
}: DraftPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "drafts" });

  return (
    <section className="cozy-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Draft tasks
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {drafts.length === 0
              ? "Nothing waiting to be scheduled"
              : `${drafts.length} waiting to be scheduled`}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
          {drafts.length}
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Drag a draft onto any date to schedule it, or drop a task back here to
        unschedule it.
      </p>

      <div
        ref={setNodeRef}
        className={cn(
          "mt-3 flex min-h-40 flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver
            ? "border-primary bg-accent/60"
            : "border-border bg-muted/30",
        )}
      >
        {drafts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-6 text-center">
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Inbox className="size-[18px]" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">
              No drafts yet
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              Create a task and save it here to schedule it later.
            </p>
            <button
              type="button"
              onClick={onAddDraft}
              className="mt-1 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              Add a draft
            </button>
          </div>
        ) : (
          drafts.map((entry) => (
            <EntryChip
              key={entry.id}
              entry={entry}
              tone={toneForEntry(entry, categoryById)}
              onOpen={onOpenEntry}
              scrollFriendly
            />
          ))
        )}
      </div>
    </section>
  );
}
