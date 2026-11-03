"use client";

import {
  COLOR_TOKENS,
  categoryTones,
  type ColorToken,
} from "@/lib/calendar/colors";
import { cn } from "@/lib/utils";

type ColorSwatchPickerProps = {
  value: ColorToken;
  onChange: (token: ColorToken) => void;
  className?: string;
};

/** The curated palette used for boards and task labels. */
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
            value === token &&
              "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card",
          )}
        />
      ))}
    </div>
  );
}
