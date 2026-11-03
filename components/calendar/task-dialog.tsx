"use client";

import { useState } from "react";
import { Bell, CalendarIcon, Inbox, SquareKanban, Trash2 } from "lucide-react";

import { CategoryPicker } from "@/components/calendar/category-picker";
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
import type {
  CalendarCategory,
  CalendarEntry,
  EntryKind,
} from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export type EntryFormValues = {
  title: string;
  notes: string;
  kind: EntryKind;
  categoryId: number | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  done: boolean;
};

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new entry. */
  entry: CalendarEntry | null;
  /** Date used when creating a new entry. */
  defaultDate: string | null;
  categories: CalendarCategory[];
  busy?: boolean;
  /** Resolves to `true` when the entry was saved. */
  onSubmit: (values: EntryFormValues) => Promise<boolean>;
  onDelete?: (entry: CalendarEntry) => Promise<boolean>;
};

export function TaskDialog({
  open,
  onOpenChange,
  entry,
  defaultDate,
  categories,
  busy = false,
  onSubmit,
  onDelete,
}: TaskDialogProps) {
  // The dialog is remounted (via a `key` in the parent) whenever the target
  // changes, so these initialisers always describe the entry being edited.
  const [title, setTitle] = useState(entry?.title ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? "task");
  const [categoryId, setCategoryId] = useState<number | null>(
    entry?.categoryId ?? null,
  );
  const [scheduledDate, setScheduledDate] = useState<string | null>(
    entry ? entry.scheduledDate : defaultDate,
  );
  const [scheduledTime, setScheduledTime] = useState<string | null>(
    entry?.scheduledTime ?? null,
  );
  const [done, setDone] = useState(entry?.done ?? false);
  const [dateOpen, setDateOpen] = useState(false);

  const submit = async () => {
    if (!title.trim() || busy) return;

    const saved = await onSubmit({
      title: title.trim(),
      notes,
      kind,
      categoryId,
      scheduledDate,
      scheduledTime,
      done,
    });

    if (saved) onOpenChange(false);
  };

  const saveAsDraft = async () => {
    if (!title.trim() || busy) return;

    const saved = await onSubmit({
      title: title.trim(),
      notes,
      kind,
      categoryId,
      scheduledDate: null,
      scheduledTime,
      done,
    });

    if (saved) onOpenChange(false);
  };

  const remove = async () => {
    if (!entry || !onDelete || busy) return;
    const removed = await onDelete(entry);
    if (removed) onOpenChange(false);
  };

  const primaryLabel = entry
    ? "Save changes"
    : scheduledDate
      ? "Add to calendar"
      : "Save to drafts";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {entry
              ? entry.kind === "reminder"
                ? "Edit reminder"
                : "Edit task"
              : "New task"}
          </DialogTitle>
          <DialogDescription>
            {entry
              ? "Update the details of this entry."
              : "Add a task or a reminder to your calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Send the quarterly report"
              autoFocus
              className="h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <ToggleGroup
              value={[kind]}
              onValueChange={(next) => {
                const nextKind = next[0];
                if (nextKind) setKind(nextKind as EntryKind);
              }}
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
            >
              <ToggleGroupItem
                value="task"
                className="flex-1 gap-1.5 rounded-lg px-2.5 text-xs"
              >
                <SquareKanban className="size-3.5" />
                Task
              </ToggleGroupItem>
              <ToggleGroupItem
                value="reminder"
                className="flex-1 gap-1.5 rounded-lg px-2.5 text-xs"
              >
                <Bell className="size-3.5" />
                Reminder
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-9 justify-start gap-2 rounded-xl px-3 font-normal",
                  )}
                >
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  {scheduledDate
                    ? formatLongDate(fromDateKey(scheduledDate))
                    : "No date — stays a draft"}
                </PopoverTrigger>

                <PopoverContent className="w-auto p-2" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      scheduledDate ? fromDateKey(scheduledDate) : undefined
                    }
                    onSelect={(date) => {
                      if (!date) return;
                      setScheduledDate(toDateKey(date));
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScheduledDate(toDateKey(new Date()))}
                className="h-9 rounded-xl text-xs"
              >
                Today
              </Button>

              {scheduledDate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScheduledDate(null)}
                  className="h-9 rounded-xl text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-time">
              Time{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="entry-time"
              type="time"
              value={scheduledTime ?? ""}
              onChange={(event) =>
                setScheduledTime(event.target.value || null)
              }
              className="h-9 w-40 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-notes">
              Notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="entry-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Anything worth remembering…"
              className="rounded-xl"
            />
          </div>

          {entry ? (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2">
              <Label htmlFor="entry-done">Mark as done</Label>
              <Switch
                id="entry-done"
                checked={done}
                onCheckedChange={(checked) => setDone(checked)}
              />
            </div>
          ) : null}

          {entry && onDelete ? (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={busy}
              className="w-full justify-start gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete this {entry.kind}
            </Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {scheduledDate ? (
            <Button
              variant="secondary"
              onClick={saveAsDraft}
              disabled={busy}
              className="gap-1.5"
            >
              <Inbox className="size-4" />
              Save to drafts
            </Button>
          ) : null}

          <Button onClick={submit} disabled={busy || !title.trim()}>
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
