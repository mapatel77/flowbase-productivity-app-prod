"use client";

import { Palette } from "lucide-react";

import { ColorSwatchPicker } from "@/components/kanban/color-swatch-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ColorToken } from "@/lib/calendar/colors";

type NoteColorPopoverProps = {
  color: ColorToken;
  onChange: (color: ColorToken) => void;
};

export function NoteColorPopover({ color, onChange }: NoteColorPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Change note colour"
            title="Note colour"
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Palette className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <p className="text-xs font-medium text-muted-foreground">Note colour</p>
        <ColorSwatchPicker value={color} onChange={onChange} className="mt-2" />
      </PopoverContent>
    </Popover>
  );
}
