"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { ColorSwatchPicker } from "@/components/kanban/color-swatch-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { categoryTones, type ColorToken } from "@/lib/calendar/colors";
import {
  LABEL_SUGGESTIONS,
  MAX_LABEL_LENGTH,
  MAX_TASK_LABELS,
} from "@/lib/kanban/constants";
import type { KanbanLabel } from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

type LabelEditorProps = {
  labels: KanbanLabel[];
  onChange: (labels: KanbanLabel[]) => void;
  className?: string;
};

/** Add and remove colour-coded task labels. */
export function LabelEditor({ labels, onChange, className }: LabelEditorProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorToken>("sky");
  const [colorOpen, setColorOpen] = useState(false);

  const addLabel = (nextName: string, nextColor: ColorToken) => {
    const trimmed = nextName.trim().slice(0, MAX_LABEL_LENGTH);
    if (!trimmed) return;
    if (labels.length >= MAX_TASK_LABELS) return;
    if (labels.some((label) => label.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    onChange([...labels, { name: trimmed, color: nextColor }]);
    setName("");
  };

  const removeLabel = (index: number) => {
    onChange(labels.filter((_, labelIndex) => labelIndex !== index));
  };

  const suggestions = LABEL_SUGGESTIONS.filter(
    (suggestion) =>
      !labels.some(
        (label) => label.name.toLowerCase() === suggestion.name.toLowerCase(),
      ),
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label, index) => (
            <span
              key={`${label.name}-${index}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                categoryTones[label.color].chip,
              )}
            >
              {label.name}
              <button
                type="button"
                onClick={() => removeLabel(index)}
                aria-label={`Remove ${label.name} label`}
                className="rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addLabel(name, color);
            }
          }}
          placeholder="Add a label"
          aria-label="Label name"
          maxLength={MAX_LABEL_LENGTH}
          disabled={labels.length >= MAX_TASK_LABELS}
          className="h-8 flex-1 rounded-lg"
        />

        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-8 rounded-lg bg-card/70"
                aria-label="Choose label colour"
              />
            }
          >
            <span
              className={cn("size-3 rounded-full", categoryTones[color].dot)}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <ColorSwatchPicker
              value={color}
              onChange={(nextColor) => {
                setColor(nextColor);
                setColorOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="sm"
          onClick={() => addLabel(name, color)}
          disabled={!name.trim() || labels.length >= MAX_TASK_LABELS}
          className="h-8 gap-1 rounded-lg"
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {suggestions.length > 0 && labels.length < MAX_TASK_LABELS ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Quick add</span>
          {suggestions.slice(0, 4).map((suggestion) => (
            <button
              key={suggestion.name}
              type="button"
              onClick={() => addLabel(suggestion.name, suggestion.color)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                categoryTones[suggestion.color].chip,
              )}
            >
              + {suggestion.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
