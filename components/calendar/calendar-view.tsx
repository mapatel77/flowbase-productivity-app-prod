"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";

import {
  createCategory,
  createEntry,
  deleteCategory,
  deleteEntry,
  moveEntry,
  toggleEntryDone,
  updateCategory,
  updateEntry,
} from "@/app/calendar/actions";
import { CalendarToolbar, type ViewMode } from "@/components/calendar/calendar-toolbar";
import { CategoryManager } from "@/components/calendar/category-manager";
import { DaySheet } from "@/components/calendar/day-sheet";
import { DraftPanel } from "@/components/calendar/draft-panel";
import { EntryChipBody } from "@/components/calendar/entry-chip";
import { MonthGrid } from "@/components/calendar/month-grid";
import {
  TaskDialog,
  type EntryFormValues,
} from "@/components/calendar/task-dialog";
import { WeekGrid } from "@/components/calendar/week-grid";
import { Toaster, toast } from "@/components/ui/toast";
import { useIsCompactCalendar } from "@/hooks/use-media-query";
import type { ColorToken } from "@/lib/calendar/colors";
import {
  addMonths,
  addWeeks,
  formatMonthTitle,
  formatWeekTitle,
  getMonthGrid,
  getWeekDays,
  toDateKey,
} from "@/lib/calendar/dates";
import { buildCategoryMap, toneForEntry } from "@/lib/calendar/tone";
import type { CalendarCategory, CalendarEntry } from "@/lib/calendar/types";

type DialogState =
  | { mode: "create"; entry: null; date: string | null }
  | { mode: "edit"; entry: CalendarEntry; date: string | null };

type CalendarViewProps = {
  initialCategories: CalendarCategory[];
  initialEntries: CalendarEntry[];
  loadError?: string | null;
};

export function CalendarView({
  initialCategories,
  initialEntries,
  loadError = null,
}: CalendarViewProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [entries, setEntries] = useState(initialEntries);
  const [view, setView] = useState<ViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    toDateKey(new Date()),
  );
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<CalendarEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const compact = useIsCompactCalendar();

  const sensors = useSensors(
    // A small threshold keeps a plain click from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    // Space starts a drag so Enter still opens the task dialog.
    useSensor(KeyboardSensor, {
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space"],
      },
    }),
  );

  const categoryById = useMemo(
    () => buildCategoryMap(categories),
    [categories],
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();

    for (const entry of entries) {
      if (!entry.scheduledDate) continue;
      const bucket = map.get(entry.scheduledDate);
      if (bucket) bucket.push(entry);
      else map.set(entry.scheduledDate, [entry]);
    }

    return map;
  }, [entries]);

  const drafts = useMemo(
    () => entries.filter((entry) => !entry.scheduledDate),
    [entries],
  );

  const days = useMemo(
    () =>
      view === "month" ? getMonthGrid(anchorDate) : getWeekDays(anchorDate),
    [view, anchorDate],
  );

  const title =
    view === "month" ? formatMonthTitle(anchorDate) : formatWeekTitle(anchorDate);

  /* ── navigation ─────────────────────────────────────────────────────── */

  const goToPrevious = () =>
    setAnchorDate((current) =>
      view === "month" ? addMonths(current, -1) : addWeeks(current, -1),
    );

  const goToNext = () =>
    setAnchorDate((current) =>
      view === "month" ? addMonths(current, 1) : addWeeks(current, 1),
    );

  const goToToday = () => {
    const now = new Date();
    setAnchorDate(now);
    setSelectedDate(toDateKey(now));
  };

  /* ── dialogs ────────────────────────────────────────────────────────── */

  const openCreate = (dateKey: string | null) =>
    setDialog({ mode: "create", entry: null, date: dateKey });

  const openEdit = (entry: CalendarEntry) =>
    setDialog({ mode: "edit", entry, date: entry.scheduledDate });

  /** Opening the task dialog from the day sheet closes the sheet first so the
   *  two modals never stack on top of each other. */
  const openEditFromSheet = (entry: CalendarEntry) => {
    setDaySheetDate(null);
    openEdit(entry);
  };

  const openCreateFromSheet = (dateKey: string) => {
    setDaySheetDate(null);
    openCreate(dateKey);
  };

  const handleSubmit = async (values: EntryFormValues): Promise<boolean> => {
    const editing = dialog?.mode === "edit" ? dialog.entry : null;

    const payload = {
      title: values.title,
      notes: values.notes || null,
      kind: values.kind,
      categoryId: values.categoryId,
      scheduledDate: values.scheduledDate,
      scheduledTime: values.scheduledTime,
    };

    setBusy(true);
    try {
      const result = editing
        ? await updateEntry({ id: editing.id, patch: payload })
        : await createEntry(payload);

      if (!result.ok) {
        toast.add({
          title: "Could not save the task",
          description: result.error,
        });
        return false;
      }

      let saved = result.data;

      if (editing && editing.done !== values.done) {
        const doneResult = await toggleEntryDone({
          id: saved.id,
          done: values.done,
        });
        if (doneResult.ok) saved = doneResult.data;
      }

      setEntries((current) =>
        editing
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [...current, saved],
      );

      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry: CalendarEntry): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await deleteEntry({ id: entry.id });

      if (!result.ok) {
        toast.add({
          title: "Could not delete the task",
          description: result.error,
        });
        return false;
      }

      setEntries((current) => current.filter((item) => item.id !== entry.id));
      return true;
    } finally {
      setBusy(false);
    }
  };

  /* ── categories ─────────────────────────────────────────────────────── */

  const handleCreateCategory = async (name: string, color: ColorToken) => {
    const result = await createCategory({ name, color });

    if (!result.ok) {
      toast.add({
        title: "Could not create the category",
        description: result.error,
      });
      return;
    }

    setCategories((current) =>
      [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleUpdateCategory = async (
    id: number,
    name: string,
    color: ColorToken,
  ) => {
    const result = await updateCategory({ id, name, color });

    if (!result.ok) {
      toast.add({
        title: "Could not update the category",
        description: result.error,
      });
      return;
    }

    setCategories((current) =>
      current.map((category) => (category.id === id ? result.data : category)),
    );
  };

  const handleDeleteCategory = async (id: number) => {
    const result = await deleteCategory({ id });

    if (!result.ok) {
      toast.add({
        title: "Could not delete the category",
        description: result.error,
      });
      return;
    }

    setCategories((current) => current.filter((category) => category.id !== id));
    setEntries((current) =>
      current.map((entry) =>
        entry.categoryId === id ? { ...entry, categoryId: null } : entry,
      ),
    );
  };

  /* ── drag and drop ──────────────────────────────────────────────────── */

  const handleDragStart = (event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as CalendarEntry | undefined;
    setActiveEntry(entry ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);

    const entry = event.active.data.current?.entry as CalendarEntry | undefined;
    const overId = event.over?.id;

    if (!entry || typeof overId !== "string") return;

    let nextDate: string | null | undefined;

    if (overId.startsWith("day:")) {
      nextDate = overId.slice("day:".length);
    } else if (overId === "drafts") {
      nextDate = null;
    }

    if (nextDate === undefined) return;
    if (nextDate === entry.scheduledDate) return;

    const previous = entry;

    // Optimistic update so the chip lands instantly.
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id ? { ...item, scheduledDate: nextDate } : item,
      ),
    );

    void (async () => {
      const result = await moveEntry({ id: entry.id, scheduledDate: nextDate });

      if (!result.ok) {
        setEntries((current) =>
          current.map((item) => (item.id === previous.id ? previous : item)),
        );
        toast.add({
          title: "Could not move the task",
          description: result.error,
        });
        return;
      }

      setEntries((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
    })();
  };

  /* ── render ─────────────────────────────────────────────────────────── */

  const daySheetEntries = daySheetDate
    ? (entriesByDate.get(daySheetDate) ?? [])
    : [];

  return (
    <Toaster>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveEntry(null)}
      >
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
          <CalendarToolbar
            view={view}
            title={title}
            categories={categories}
            onPrev={goToPrevious}
            onNext={goToNext}
            onToday={goToToday}
            onViewChange={setView}
            onNewTask={() => openCreate(selectedDate)}
            onManageCategories={() => setManagerOpen(true)}
          />

          {loadError ? (
            <div className="cozy-card px-4 py-3 text-sm text-destructive">
              {loadError}
            </div>
          ) : null}

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              {view === "month" ? (
                <MonthGrid
                  days={days}
                  anchorDate={anchorDate}
                  entriesByDate={entriesByDate}
                  categoryById={categoryById}
                  selectedDate={selectedDate}
                  compact={compact}
                  onSelect={setSelectedDate}
                  onQuickAdd={openCreate}
                  onOpenEntry={openEdit}
                  onOpenDay={setDaySheetDate}
                />
              ) : (
                <WeekGrid
                  days={days}
                  entriesByDate={entriesByDate}
                  categoryById={categoryById}
                  selectedDate={selectedDate}
                  compact={compact}
                  onSelect={setSelectedDate}
                  onQuickAdd={openCreate}
                  onOpenEntry={openEdit}
                />
              )}
            </div>

            <DraftPanel
              drafts={drafts}
              categoryById={categoryById}
              onOpenEntry={openEdit}
              onAddDraft={() => openCreate(null)}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeEntry ? (
            <EntryChipBody
              entry={activeEntry}
              tone={toneForEntry(activeEntry, categoryById)}
              className="shadow-lg ring-2 ring-primary/30"
            />
          ) : null}
        </DragOverlay>

        <TaskDialog
          key={`${dialog?.mode ?? "none"}-${
            dialog?.mode === "edit"
              ? dialog.entry.id
              : (dialog?.date ?? "draft")
          }`}
          open={dialog !== null}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          entry={dialog?.entry ?? null}
          defaultDate={dialog?.date ?? null}
          categories={categories}
          busy={busy}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />

        <CategoryManager
          open={managerOpen}
          onOpenChange={setManagerOpen}
          categories={categories}
          onCreate={handleCreateCategory}
          onUpdate={handleUpdateCategory}
          onDelete={handleDeleteCategory}
        />

        <DaySheet
          open={daySheetDate !== null}
          onOpenChange={(open) => {
            if (!open) setDaySheetDate(null);
          }}
          dateKey={daySheetDate}
          entries={daySheetEntries}
          categoryById={categoryById}
          onOpenEntry={openEditFromSheet}
          onAdd={openCreateFromSheet}
        />
      </DndContext>
    </Toaster>
  );
}
