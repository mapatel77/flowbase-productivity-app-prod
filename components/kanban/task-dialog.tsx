"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Flag,
  NotebookPen,
  SquareKanban,
  Trash2,
} from "lucide-react";

import { LabelEditor } from "@/components/kanban/label-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  formatLongDate,
  fromDateKey,
  toDateKey,
} from "@/lib/calendar/dates";
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
} from "@/lib/kanban/constants";
import type {
  KanbanLabel,
  KanbanPriority,
  KanbanTask,
} from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

export type TaskFormValues = {
  title: string;
  description: string;
  dueDate: string;
  priority: KanbanPriority;
  labels: KanbanLabel[];
  syncCalendar: boolean;
  notesLinked: boolean;
};

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new task. */
  task: KanbanTask | null;
  columnName: string;
  busy?: boolean;
  onSubmit: (values: TaskFormValues) => Promise<boolean>;
  onDelete?: (task: KanbanTask) => Promise<boolean>;
};

const PRIORITY_ICONS = {
  low: "text-emerald-500 dark:text-emerald-400",
  medium: "text-amber-500 dark:text-amber-400",
  high: "text-rose-500 dark:text-rose-400",
} as const;

const PRIORITY_ACTIVE_CLASSES: Record<KanbanPriority, string> = {
  low: "aria-pressed:bg-emerald-100 aria-pressed:text-emerald-700 dark:aria-pressed:bg-emerald-500/15 dark:aria-pressed:text-emerald-300",
  medium:
    "aria-pressed:bg-amber-100 aria-pressed:text-amber-700 dark:aria-pressed:bg-amber-500/15 dark:aria-pressed:text-amber-300",
  high: "aria-pressed:bg-rose-100 aria-pressed:text-rose-700 dark:aria-pressed:bg-rose-500/15 dark:aria-pressed:text-rose-300",
};

export function TaskDialog({
  open,
  onOpenChange,
  task,
  columnName,
  busy = false,
  onSubmit,
  onDelete,
}: TaskDialogProps) {
  // The parent remounts this dialog with a `key` whenever the target changes.
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ?? toDateKey(new Date()),
  );
  const [priority, setPriority] = useState<KanbanPriority>(
    task?.priority ?? "medium",
  );
  const [labels, setLabels] = useState<KanbanLabel[]>(task?.labels ?? []);
  const [syncCalendar, setSyncCalendar] = useState(
    Boolean(task?.calendarEntryId),
  );
  const [notesLinked, setNotesLinked] = useState(task?.notesLinked ?? false);
  const [dateOpen, setDateOpen] = useState(false);

  const submit = async () => {
    if (!title.trim() || busy) return;

    const saved = await onSubmit({
      title: title.trim(),
      description,
      dueDate,
      priority,
      labels,
      syncCalendar,
      notesLinked,
    });

    if (saved) onOpenChange(false);
  };

  const remove = async () => {
    if (!task || !onDelete || busy) return;
    const removed = await onDelete(task);
    if (removed) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the details of this task."
              : `Add a task to ${columnName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Sketch the onboarding flow"
              autoFocus
              maxLength={120}
              className="h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="A little more context, links or acceptance notes…"
              className="rounded-xl"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Due date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-9 w-full justify-start gap-2 rounded-xl px-3 font-normal",
                  )}
                >
                  <CalendarDays className="size-4 text-rose-500 dark:text-rose-400" />
                  <span className="truncate">
                    {dueDate ? formatLongDate(fromDateKey(dueDate)) : "No date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate ? fromDateKey(dueDate) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setDueDate(toDateKey(date));
                      setDateOpen(false);
                    }}
                  />
                  <div className="flex justify-end border-t border-border/70 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDueDate(toDateKey(new Date()));
                        setDateOpen(false);
                      }}
                      className="h-7 rounded-lg text-xs"
                    >
                      Today
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <ToggleGroup
                value={[priority]}
                onValueChange={(next) => {
                  const nextPriority = next[0];
                  if (nextPriority) {
                    setPriority(nextPriority as KanbanPriority);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
              >
                {(["low", "medium", "high"] as KanbanPriority[]).map(
                  (value) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      className={cn(
                        "flex-1 gap-1 rounded-lg px-2 text-[11px]",
                        PRIORITY_ACTIVE_CLASSES[value],
                      )}
                    >
                      <Flag
                        className={cn("size-3.5", PRIORITY_ICONS[value])}
                      />
                      {PRIORITY_LABELS[value]}
                    </ToggleGroupItem>
                  ),
                )}
              </ToggleGroup>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Labels</Label>
            <LabelEditor labels={labels} onChange={setLabels} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {syncCalendar ? (
                  <CalendarCheck className="size-4 shrink-0 text-rose-500 dark:text-rose-400" />
                ) : (
                  <CalendarDays className="size-4 shrink-0 text-rose-500 dark:text-rose-400" />
                )}
                <div className="min-w-0">
                  <Label htmlFor="task-sync-calendar" className="text-xs">
                    Sync with Calendar
                  </Label>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {syncCalendar
                      ? "A matching task is kept in Calendar."
                      : "Add this task to your Calendar."}
                  </p>
                </div>
              </div>
              <Switch
                id="task-sync-calendar"
                checked={syncCalendar}
                onCheckedChange={setSyncCalendar}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <NotebookPen className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <div className="min-w-0">
                  <Label htmlFor="task-link-notes" className="text-xs">
                    Link with Notes
                  </Label>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {notesLinked
                      ? "Linked — the connection is remembered."
                      : "Keep this task connected to Notes."}
                  </p>
                </div>
              </div>
              <Switch
                id="task-link-notes"
                checked={notesLinked}
                onCheckedChange={setNotesLinked}
                size="sm"
              />
            </div>
          </div>

          {task && onDelete ? (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={busy}
              className="w-full justify-start gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete this task
            </Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="gap-1.5"
          >
            <SquareKanban className="size-4" />
            {task ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
