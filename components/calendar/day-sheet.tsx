"use client";

import { Plus } from "lucide-react";

import { EntryChip } from "@/components/calendar/entry-chip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatLongDate, fromDateKey } from "@/lib/calendar/dates";
import { toneForEntry } from "@/lib/calendar/tone";
import type { CalendarCategory, CalendarEntry } from "@/lib/calendar/types";

type DaySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  entries: CalendarEntry[];
  categoryById: Map<number, CalendarCategory>;
  onOpenEntry: (entry: CalendarEntry) => void;
  onAdd: (dateKey: string) => void;
};

/**
 * Lists everything planned for a single day. Used for the "+N more" overflow
 * on the month grid and for tapping a day on a phone.
 */
export function DaySheet({
  open,
  onOpenChange,
  dateKey,
  entries,
  categoryById,
  onOpenEntry,
  onAdd,
}: DaySheetProps) {
  const title = dateKey
    ? formatLongDate(fromDateKey(dateKey))
    : "Selected day";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {entries.length === 0
              ? "Nothing is planned for this day yet."
              : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} on this day.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-xs text-muted-foreground">
              Add a task or a reminder to fill this day.
            </p>
          ) : (
            entries.map((entry) => (
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

        {dateKey ? (
          <SheetFooter>
            <Button
              onClick={() => onAdd(dateKey)}
              className="w-full gap-1.5 rounded-lg"
            >
              <Plus className="size-4" />
              Add a task on this day
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
