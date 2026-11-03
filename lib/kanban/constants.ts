import type { ColorToken } from "@/lib/calendar/colors";
import type { KanbanPriority } from "@/lib/kanban/types";

/** Every new board starts with these three columns. */
export const DEFAULT_COLUMNS = ["Todo", "In Progress", "Done"] as const;

/** A board can never have more than five columns. */
export const MAX_COLUMNS = 5;

/** Soft accent colours used for column dots, in column order. */
export const COLUMN_COLOR_TOKENS: ColorToken[] = [
  "sky",
  "amber",
  "emerald",
  "violet",
  "rose",
];

export const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/**
 * Static Tailwind classes for the three priority levels. Keeping the full
 * class names here means Tailwind can see them during the build.
 */
export const PRIORITY_TONES: Record<
  KanbanPriority,
  { chip: string; dot: string; icon: string }
> = {
  low: {
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-400",
    icon: "text-emerald-500 dark:text-emerald-400",
  },
  medium: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-400",
    icon: "text-amber-500 dark:text-amber-400",
  },
  high: {
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-400",
    icon: "text-rose-500 dark:text-rose-400",
  },
};

/** Quick-add suggestions shown under the label editor. */
export const LABEL_SUGGESTIONS: Array<{ name: string; color: ColorToken }> = [
  { name: "Design", color: "violet" },
  { name: "Bug", color: "rose" },
  { name: "Research", color: "sky" },
  { name: "Urgent", color: "amber" },
];

/** Maximum labels kept on a single task. */
export const MAX_TASK_LABELS = 8;

/** Maximum characters kept in a task label name. */
export const MAX_LABEL_LENGTH = 24;
