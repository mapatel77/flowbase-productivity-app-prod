"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { EntryChip } from "@/components/calendar/entry-chip";
import {
  formatDayNumber,
  formatLongDate,
  isToday,
  toDateKey,
} from "@/lib/calendar/dates";
import { toneForEntry } from "@/lib/calendar/tone";
import type { CalendarCategory, CalendarEntry } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_CHIPS = 3;

type DayCellProps = {
  date: Date;
  entries: CalendarEntry[];
  categoryById: Map<number, CalendarCategory>;
  isOutside: boolean;
  isSelected: boolean;
  /** Compact mode (phones) swaps the chips for coloured dots. */
  compact: boolean;
  onSelect: (dateKey: string) => void;
  onQuickAdd: (dateKey: string) => void;
  onOpenEntry: (entry: CalendarEntry) => void;
  onOpenDay: (dateKey: string) => void;
};

export function DayCell({
  date,
  entries,
  categoryById,
  isOutside,
  isSelected,
  compact,
  onSelect,
  onQuickAdd,
  onOpenEntry,
  onOpenDay,
}: DayCellProps) {
  const dateKey = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateKey}`,
    data: { date: dateKey },
  });

  const today = isToday(date);
  const visible = entries.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenCount = entries.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      onClick={compact ? () => onOpenDay(dateKey) : undefined}
      className={cn(
        "group relative flex min-h-0 flex-col gap-1 bg-card p-1.5 transition-colors",
        compact && "cursor-pointer",
        isOver && "bg-accent/60 ring-2 ring-inset ring-primary/50",
        !isOver && isSelected && "bg-accent/25",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(dateKey);
          }}
          aria-label={formatLongDate(date)}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
            today && "bg-primary text-primary-foreground",
            !today && isOutside && "text-muted-foreground/50 hover:bg-muted",
            !today && !isOutside && "text-foreground/75 hover:bg-muted",
            isSelected && !today && "bg-accent text-accent-foreground",
          )}
        >
          {formatDayNumber(date)}
        </button>

        {!compact ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickAdd(dateKey);
            }}
            aria-label={`Add a task on ${formatLongDate(date)}`}
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none group-hover:opacity-100"
          >
            <Plus className="size-3.5" />
          </button>
        ) : null}
      </div>

      {compact ? (
        <div className="flex flex-wrap items-center gap-0.5 px-0.5">
          {visible.map((entry) => (
            <span
              key={entry.id}
              className={cn(
                "size-1.5 rounded-full",
                toneForEntry(entry, categoryById).dot,
              )}
            />
          ))}
          {hiddenCount > 0 ? (
            <span className="text-[9px] font-semibold text-muted-foreground">
              +{hiddenCount}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-1">
          {visible.map((entry) => (
            <EntryChip
              key={entry.id}
              entry={entry}
              tone={toneForEntry(entry, categoryById)}
              onOpen={onOpenEntry}
            />
          ))}

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenDay(dateKey);
              }}
              className="rounded-md px-1 py-0.5 text-left text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              +{hiddenCount} more
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
