"use client";

import { LayoutGrid, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpaceFilter, SpaceSort } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

export const SPACE_FILTER_LABELS: Record<SpaceFilter, string> = {
  all: "All Spaces",
  favourite: "Favourite",
  recent: "Recently Opened",
  archived: "Archived",
};

export const SPACE_SORT_LABELS: Record<SpaceSort, string> = {
  "recently-updated": "Recently Updated",
  name: "Name",
  "most-pages": "Most Pages",
  favorites: "Favorites",
};

const SPACE_FILTERS: SpaceFilter[] = ["all", "favourite", "recent", "archived"];
const SPACE_SORTS: SpaceSort[] = [
  "recently-updated",
  "name",
  "most-pages",
  "favorites",
];

type SpacesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: SpaceFilter;
  onFilterChange: (filter: SpaceFilter) => void;
  sort: SpaceSort;
  onSortChange: (sort: SpaceSort) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
};

/** Search, filters, sort and the grid/list switch above the spaces. */
export function SpacesToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: SpacesToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search spaces or pages…"
            aria-label="Search spaces or pages"
            className="h-9 rounded-xl border-border/70 bg-card pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1">
          {SPACE_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onFilterChange(item)}
              aria-pressed={filter === item}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                filter === item
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {SPACE_FILTER_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={sort}
            onValueChange={(value) => {
              if (value === null) return;
              onSortChange(value as SpaceSort);
            }}
          >
            <SelectTrigger
              aria-label="Sort spaces"
              className="h-9 w-[10.5rem] rounded-xl border-border/70 bg-card"
            >
              <SelectValue>
                {(value) => SPACE_SORT_LABELS[value as SpaceSort] ?? "Sort"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SPACE_SORTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {SPACE_SORT_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-card p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => onViewChange("grid")}
              className={cn(
                "rounded-lg",
                view === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <LayoutGrid />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => onViewChange("list")}
              className={cn(
                "rounded-lg",
                view === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <List />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
