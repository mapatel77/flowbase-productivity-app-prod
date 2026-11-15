"use client";

import { Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STICKY_NOTE_COLORS } from "@/lib/whiteboard/constants";

type WhiteboardColorPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyStroke: (color: string) => void;
  onApplyBackground: (color: string) => void;
  onApplyText: (color: string) => void;
  onAddSticky: (colorKey: string) => void;
};

const STROKE_COLORS = [
  "#1e1e1e",
  "#64748b",
  "#475569",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const BACKGROUND_COLORS = [
  "#ffffff",
  "#fdf3e3",
  "#e8f6ef",
  "#e9effc",
  "#f6e8f8",
  "#fdeae4",
  "#eef7f6",
];

const TEXT_COLORS = [
  "#1e1e1e",
  "#475569",
  "#7c2d12",
  "#166534",
  "#1e3a8a",
  "#581c87",
];

function SwatchButton({
  color,
  label,
  onSelect,
}: {
  color: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      title={label}
      className="rounded-lg border border-border bg-background p-0.5 shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <span
        className="block size-6 rounded-md border border-black/10"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}

export function WhiteboardColorPicker({
  open,
  onOpenChange,
  onApplyStroke,
  onApplyBackground,
  onApplyText,
  onAddSticky,
}: WhiteboardColorPickerProps) {
  const applyStroke = (color: string) => {
    onApplyStroke(color);
    onOpenChange(false);
  };

  const applyBackground = (color: string) => {
    onApplyBackground(color);
    onOpenChange(false);
  };

  const applyText = (color: string) => {
    onApplyText(color);
    onOpenChange(false);
  };

  const addSticky = (colorKey: string) => {
    onAddSticky(colorKey);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl px-2.5 text-[12px]">
            <Palette className="size-3.5" />
            <span className="hidden sm:inline">Colors</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stroke colour
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STROKE_COLORS.map((color) => (
                <SwatchButton key={color} color={color} label={`Stroke ${color}`} onSelect={() => applyStroke(color)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Background colour
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BACKGROUND_COLORS.map((color) => (
                <SwatchButton key={color} color={color} label={`Background ${color}`} onSelect={() => applyBackground(color)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Text colour
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((color) => (
                <SwatchButton key={color} color={color} label={`Text ${color}`} onSelect={() => applyText(color)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sticky note colour
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STICKY_NOTE_COLORS.map((entry) => (
                <SwatchButton key={entry.key} color={entry.background} label={`Sticky ${entry.label}`} onSelect={() => addSticky(entry.key)} />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
