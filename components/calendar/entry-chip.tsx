"use client";

import { useDraggable } from "@dnd-kit/core";
import { Bell } from "lucide-react";

import type { Tone } from "@/lib/calendar/colors";
import { formatTimeLabel } from "@/lib/calendar/dates";
import type { CalendarEntry } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type EntryChipBodyProps = {
  entry: CalendarEntry;
  tone: Tone;
  className?: string;
};

/**
 * The visual part of a task chip. Tasks get a coloured dot, reminders get a
 * bell and a dashed outline so the two are easy to tell apart at a glance.
 */
export function EntryChipBody({ entry, tone, className }: EntryChipBodyProps) {
  const isReminder = entry.kind === "reminder";
  const timeLabel = formatTimeLabel(entry.scheduledTime);

  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] leading-tight font-medium",
        tone.chip,
        isReminder && cn("border border-dashed", tone.border),
        entry.done && "text-muted-foreground line-through opacity-60",
        className,
      )}
    >
      {isReminder ? (
        <Bell className="size-3 shrink-0" />
      ) : (
        <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      )}

      <span className="min-w-0 flex-1 truncate">{entry.title}</span>

      {timeLabel ? (
        <span className="shrink-0 text-[10px] font-semibold opacity-70">
          {timeLabel}
        </span>
      ) : null}
    </span>
  );
}

type EntryChipProps = {
  entry: CalendarEntry;
  tone: Tone;
  onOpen?: (entry: CalendarEntry) => void;
  className?: string;
  /** Disables the drag affordance where vertical scrolling matters more. */
  scrollFriendly?: boolean;
};

/**
 * A draggable task chip. Every chip — scheduled or draft — can be dragged
 * onto any calendar day, or dropped back into the Draft Task Panel.
 */
export function EntryChip({
  entry,
  tone,
  onOpen,
  className,
  scrollFriendly = false,
}: EntryChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `entry:${entry.id}`,
    data: { entry },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpen?.(entry)}
      {...listeners}
      {...attributes}
      className={cn(
        "block w-full cursor-grab rounded-lg text-left transition-opacity focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none active:cursor-grabbing",
        scrollFriendly ? "touch-pan-y" : "touch-none",
        isDragging && "opacity-40",
        className,
      )}
    >
      <EntryChipBody entry={entry} tone={tone} />
    </button>
  );
}
