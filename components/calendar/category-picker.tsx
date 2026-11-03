"use client";

import { categoryTones, COLOR_TOKENS, type ColorToken } from "@/lib/calendar/colors";
import type { CalendarCategory } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type ColorSwatchPickerProps = {
  value: ColorToken;
  onChange: (token: ColorToken) => void;
  className?: string;
};

/** The curated palette users pick category colours from. */
export function ColorSwatchPicker({
  value,
  onChange,
  className,
}: ColorSwatchPickerProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {COLOR_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => onChange(token)}
          aria-label={`${token} colour`}
          aria-pressed={value === token}
          className={cn(
            "size-5 rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
            categoryTones[token].dot,
            value === token && "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card",
          )}
        />
      ))}
    </div>
  );
}

type CategoryPickerProps = {
  categories: CalendarCategory[];
  value: number | null;
  onChange: (categoryId: number | null) => void;
  className?: string;
};

/** Colour-coded category chooser used inside the task dialog. */
export function CategoryPicker({
  categories,
  value,
  onChange,
  className,
}: CategoryPickerProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-3", className)}>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-2 text-left text-xs transition-colors hover:border-border hover:bg-muted",
          value === null && "border-primary/50 bg-accent/50 ring-1 ring-primary/30",
        )}
      >
        <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
        <span className="truncate">No category</span>
      </button>

      {categories.map((category) => {
        const tone = categoryTones[category.color] ?? categoryTones.sky;
        const selected = value === category.id;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            aria-pressed={selected}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-2 text-left text-xs transition-colors hover:border-border hover:bg-muted",
              selected && "border-primary/50 bg-accent/50 ring-1 ring-primary/30",
            )}
          >
            <span className={cn("size-2.5 shrink-0 rounded-full", tone.dot)} />
            <span className="truncate">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
