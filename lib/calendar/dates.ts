/**
 * Date helpers for the Calendar page.
 *
 * Every date key in the app is an ISO `yyyy-MM-dd` string in the user's local
 * timezone, which keeps the database, the URL and the drag & drop payloads in
 * agreement.
 */

import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WEEKDAY_LABELS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** `Date` -> `yyyy-MM-dd`. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** `yyyy-MM-dd` -> local midnight `Date`. */
export function fromDateKey(key: string): Date {
  return parseISO(key);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * The 42 day grid backing the month view: six weeks starting on the Sunday
 * before (or on) the first of the month, so the calendar never changes height
 * while paging through months.
 */
export function getMonthGrid(anchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

/** The seven days of the week containing `anchor`, starting on Sunday. */
export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatMonthTitle(anchor: Date): string {
  return format(anchor, "MMMM yyyy");
}

export function formatWeekTitle(anchor: Date): string {
  const days = getWeekDays(anchor);
  const first = days[0];
  const last = days[days.length - 1];

  if (isSameMonth(first, last)) {
    return `${format(first, "d MMMM")} – ${format(last, "d MMMM yyyy")}`;
  }

  return `${format(first, "d MMM")} – ${format(last, "d MMM yyyy")}`;
}

export function formatDayNumber(date: Date): string {
  return format(date, "d");
}

export function formatLongDate(date: Date): string {
  return format(date, "EEEE d MMMM yyyy");
}

export function formatShortDate(date: Date): string {
  return format(date, "EEE d MMM");
}

/**
 * Normalises the `HH:mm:ss` shape Postgres returns for `time` columns into
 * the shorter `HH:mm` used throughout the UI.
 */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  if (hours === undefined || minutes === undefined) return null;
  return `${hours.padStart(2, "0")}:${minutes}`;
}

export function formatTimeLabel(value: string | null | undefined): string | null {
  const normalized = normalizeTime(value);
  if (!normalized) return null;

  const [hours, minutes] = normalized.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
};
