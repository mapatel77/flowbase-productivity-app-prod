"use client";

import { DayCell } from "@/components/calendar/day-cell";
import {
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar/dates";
import type { CalendarCategory, CalendarEntry } from "@/lib/calendar/types";

type MonthGridProps = {
  days: Date[];
  anchorDate: Date;
  entriesByDate: Map<string, CalendarEntry[]>;
  categoryById: Map<number, CalendarCategory>;
  selectedDate: string | null;
  compact: boolean;
  onSelect: (dateKey: string) => void;
  onQuickAdd: (dateKey: string) => void;
  onOpenEntry: (entry: CalendarEntry) => void;
  onOpenDay: (dateKey: string) => void;
};

/** A complete six-week view of the month currently in focus. */
export function MonthGrid({
  days,
  anchorDate,
  entriesByDate,
  categoryById,
  selectedDate,
  compact,
  onSelect,
  onQuickAdd,
  onOpenEntry,
  onOpenDay,
}: MonthGridProps) {
  return (
    <div className="cozy-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/70 bg-muted/50">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid auto-rows-fr grid-cols-7 gap-px bg-border/60"
        style={{ minHeight: compact ? 300 : 560 }}
      >
        {days.map((day) => {
          const dateKey = toDateKey(day);

          return (
            <DayCell
              key={dateKey}
              date={day}
              entries={entriesByDate.get(dateKey) ?? []}
              categoryById={categoryById}
              isOutside={!isSameMonth(day, anchorDate)}
              isSelected={selectedDate === dateKey}
              compact={compact}
              onSelect={onSelect}
              onQuickAdd={onQuickAdd}
              onOpenEntry={onOpenEntry}
              onOpenDay={onOpenDay}
            />
          );
        })}
      </div>
    </div>
  );
}
