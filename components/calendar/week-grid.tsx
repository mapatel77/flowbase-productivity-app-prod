"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { EntryChip } from "@/components/calendar/entry-chip";
import { format, isToday, toDateKey } from "@/lib/calendar/dates";
import { toneForEntry } from "@/lib/calendar/tone";
import type { CalendarCategory, CalendarEntry } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type WeekDayColumnProps = {
  date: Date;
  entries: CalendarEntry[];
  categoryById: Map<number, CalendarCategory>;
  isSelected: boolean;
  compact: boolean;
  onSelect: (dateKey: string) => void;
  onQuickAdd: (dateKey: string) => void;
  onOpenEntry: (entry: CalendarEntry) => void;
};

function WeekDayColumn({
  date,
  entries,
  categoryById,
  isSelected,
  compact,
  onSelect,
  onQuickAdd,
  onOpenEntry,
}: WeekDayColumnProps) {
  const dateKey = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateKey}`,
    data: { date: dateKey },
  });

  const today = isToday(date);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-col gap-2 bg-card p-2 transition-colors",
        isOver && "bg-accent/60 ring-2 ring-inset ring-primary/50",
        !isOver && isSelected && "bg-accent/25",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onSelect(dateKey)}
          className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              today ? "text-primary" : "text-muted-foreground",
            )}
          >
            {format(date, "EEE")}
          </span>
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
              today && "bg-primary text-primary-foreground",
              !today && "text-foreground/80",
            )}
          >
            {format(date, "d")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onQuickAdd(dateKey)}
          aria-label={`Add a task on ${format(date, "EEEE d MMMM")}`}
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-1">
        {entries.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground/70">
            {compact ? "Nothing planned" : "Drop a task here"}
          </p>
        ) : null}

        {entries.map((entry) => (
          <EntryChip
            key={entry.id}
            entry={entry}
            tone={toneForEntry(entry, categoryById)}
            onOpen={onOpenEntry}
          />
        ))}
      </div>
    </div>
  );
}

type WeekGridProps = {
  days: Date[];
  entriesByDate: Map<string, CalendarEntry[]>;
  categoryById: Map<number, CalendarCategory>;
  selectedDate: string | null;
  compact: boolean;
  onSelect: (dateKey: string) => void;
  onQuickAdd: (dateKey: string) => void;
  onOpenEntry: (entry: CalendarEntry) => void;
};

/** Seven day columns for the week currently in focus. */
export function WeekGrid({
  days,
  entriesByDate,
  categoryById,
  selectedDate,
  compact,
  onSelect,
  onQuickAdd,
  onOpenEntry,
}: WeekGridProps) {
  if (compact) {
    return (
      <div className="cozy-card divide-y divide-border/60 overflow-hidden">
        {days.map((day) => {
          const dateKey = toDateKey(day);

          return (
            <WeekDayColumn
              key={dateKey}
              date={day}
              entries={entriesByDate.get(dateKey) ?? []}
              categoryById={categoryById}
              isSelected={selectedDate === dateKey}
              compact
              onSelect={onSelect}
              onQuickAdd={onQuickAdd}
              onOpenEntry={onOpenEntry}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="cozy-card overflow-hidden">
      <div
        className="grid grid-cols-7 gap-px bg-border/60"
        style={{ minHeight: 460 }}
      >
        {days.map((day) => {
          const dateKey = toDateKey(day);

          return (
            <WeekDayColumn
              key={dateKey}
              date={day}
              entries={entriesByDate.get(dateKey) ?? []}
              categoryById={categoryById}
              isSelected={selectedDate === dateKey}
              compact={false}
              onSelect={onSelect}
              onQuickAdd={onQuickAdd}
              onOpenEntry={onOpenEntry}
            />
          );
        })}
      </div>
    </div>
  );
}
