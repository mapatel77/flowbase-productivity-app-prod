"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Plus,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryTones } from "@/lib/calendar/colors";
import type { CalendarCategory } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export type ViewMode = "month" | "week";

type CalendarToolbarProps = {
  view: ViewMode;
  title: string;
  categories: CalendarCategory[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewMode) => void;
  onNewTask: () => void;
  onManageCategories: () => void;
};

export function CalendarToolbar({
  view,
  title,
  categories,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onNewTask,
  onManageCategories,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onPrev}
            aria-label={view === "month" ? "Previous month" : "Previous week"}
            className="size-8 rounded-lg bg-card/70"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onNext}
            aria-label={view === "month" ? "Next month" : "Next week"}
            className="size-8 rounded-lg bg-card/70"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Today
          </Button>

          <h1 className="ml-1 font-heading text-xl font-semibold tracking-tight md:text-2xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup
            value={[view]}
            onValueChange={(next) => {
              const nextView = next[0];
              if (nextView) onViewChange(nextView as ViewMode);
            }}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            <ToggleGroupItem
              value="month"
              className="gap-1.5 rounded-lg px-2.5 text-xs"
            >
              <CalendarDays className="size-3.5" />
              Month
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              className="gap-1.5 rounded-lg px-2.5 text-xs"
            >
              <Columns3 className="size-3.5" />
              Week
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            onClick={onNewTask}
            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-primary-foreground shadow-sm hover:bg-primary/85"
          >
            <Plus className="size-4" />
            New task
          </Button>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((category) => {
            const tone = categoryTones[category.color] ?? categoryTones.sky;

            return (
              <span
                key={category.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  tone.chip,
                )}
              >
                <span className={cn("size-1.5 rounded-full", tone.dot)} />
                {category.name}
              </span>
            );
          })}

          <Button
            variant="ghost"
            size="xs"
            onClick={onManageCategories}
            className="ml-1 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Tags className="size-3.5" />
            Manage categories
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="xs"
          onClick={onManageCategories}
          className="w-fit gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Tags className="size-3.5" />
          Add your first category
        </Button>
      )}
    </div>
  );
}
