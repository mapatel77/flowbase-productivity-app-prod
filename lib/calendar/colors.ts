/**
 * The category colour palette.
 *
 * Users manage their own categories, but they pick from a curated set of hues
 * so every calendar stays inside the Flowbase palette. Each token maps to a
 * *static* set of Tailwind classes — Tailwind cannot see dynamically built
 * class names such as `bg-${color}-100`, so the lookup table has to be literal.
 */

export const COLOR_TOKENS = [
  "sky",
  "emerald",
  "amber",
  "indigo",
  "rose",
  "violet",
  "teal",
  "orange",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export type Tone = {
  /** Soft tinted chip used on the calendar and in lists. */
  chip: string;
  /** Solid pill used for legends and strong accents. */
  solid: string;
  /** Small colour dot. */
  dot: string;
  /** Focus / selection ring. */
  ring: string;
  /** Hairline border for reminders. */
  border: string;
};

export const categoryTones: Record<ColorToken, Tone> = {
  sky: {
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    solid: "bg-sky-500 text-white",
    dot: "bg-sky-400",
    ring: "ring-sky-400/70",
    border: "border-sky-300 dark:border-sky-500/40",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    solid: "bg-emerald-500 text-white",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/70",
    border: "border-emerald-300 dark:border-emerald-500/40",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    solid: "bg-amber-500 text-white",
    dot: "bg-amber-400",
    ring: "ring-amber-400/70",
    border: "border-amber-300 dark:border-amber-500/40",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    solid: "bg-indigo-500 text-white",
    dot: "bg-indigo-400",
    ring: "ring-indigo-400/70",
    border: "border-indigo-300 dark:border-indigo-500/40",
  },
  rose: {
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    solid: "bg-rose-500 text-white",
    dot: "bg-rose-400",
    ring: "ring-rose-400/70",
    border: "border-rose-300 dark:border-rose-500/40",
  },
  violet: {
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    solid: "bg-violet-500 text-white",
    dot: "bg-violet-400",
    ring: "ring-violet-400/70",
    border: "border-violet-300 dark:border-violet-500/40",
  },
  teal: {
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    solid: "bg-teal-500 text-white",
    dot: "bg-teal-400",
    ring: "ring-teal-400/70",
    border: "border-teal-300 dark:border-teal-500/40",
  },
  orange: {
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    solid: "bg-orange-500 text-white",
    dot: "bg-orange-400",
    ring: "ring-orange-400/70",
    border: "border-orange-300 dark:border-orange-500/40",
  },
};

/** Neutral tone used by entries without a category. */
export const neutralTone: Tone = {
  chip: "bg-muted text-muted-foreground",
  solid: "bg-muted-foreground text-background",
  dot: "bg-muted-foreground/50",
  ring: "ring-muted-foreground/40",
  border: "border-border",
};

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === "string" && (COLOR_TOKENS as readonly string[]).includes(value);
}

export function resolveTone(color: string | null | undefined): Tone {
  return isColorToken(color) ? categoryTones[color] : neutralTone;
}
