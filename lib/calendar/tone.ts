import { resolveTone, type Tone } from "./colors";
import type { CalendarCategory, CalendarEntry } from "./types";

/** Indexes categories by id so lookups stay O(1) while rendering. */
export function buildCategoryMap(
  categories: CalendarCategory[],
): Map<number, CalendarCategory> {
  return new Map(categories.map((category) => [category.id, category]));
}

/** The colour an entry is painted with, based on its category. */
export function toneForEntry(
  entry: CalendarEntry,
  categoryById: Map<number, CalendarCategory>,
): Tone {
  if (!entry.categoryId) return resolveTone(null);
  return resolveTone(categoryById.get(entry.categoryId)?.color);
}
