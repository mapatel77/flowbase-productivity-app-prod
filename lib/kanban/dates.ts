import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";

import { toDateKey } from "@/lib/calendar/dates";

/** Short, friendly label for a task due date. */
export function formatDueDate(value: string): string {
  const date = parseISO(value);

  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";

  return format(date, "MMM d");
}

/** True when the date is before today. */
export function isOverdue(value: string): boolean {
  return value < toDateKey(new Date());
}

/** True when a column represents completed work, based on its name. */
export function isDoneColumn(name: string): boolean {
  const value = name.trim().toLowerCase();
  return value.includes("done") || value.includes("complete");
}
