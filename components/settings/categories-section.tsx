"use client";

import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createSettingsCategory,
  deleteSettingsCategory,
  updateSettingsCategory,
} from "@/app/settings/actions";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ColorSwatchPicker } from "@/components/shared/color-swatch-picker";
import {
  SettingsSection,
} from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/toast";
import {
  categoryTones,
  type ColorToken,
} from "@/lib/calendar/colors";
import {
  CATEGORY_SCOPES,
  CATEGORY_SCOPE_LABELS,
  type CalendarCategory,
  type CategoryScope,
} from "@/lib/calendar/types";
import {
  CATEGORY_ICON_OPTIONS,
  CATEGORY_NAME_MAX_LENGTH,
} from "@/lib/settings/constants";
import { cn } from "@/lib/utils";

const scopeStyles: Record<CategoryScope, string> = {
  calendar:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  task: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  note: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  reminder:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

function CategoryDialog({
  open,
  onOpenChange,
  scope,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: CategoryScope;
  category: CalendarCategory | null;
  onSaved: (category: CalendarCategory) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorToken>("sky");
  const [icon, setIcon] = useState("Tag");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? "sky");
    setIcon(category?.icon ?? "Tag");
    setBusy(false);
  }, [open, category]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.add({
        title: "Give the category a name",
        description: "Short and recognisable works best.",
        type: "error",
      });
      return;
    }

    setBusy(true);

    try {
      const result = category
        ? await updateSettingsCategory({
            id: category.id,
            name: trimmed,
            color,
            icon,
          })
        : await createSettingsCategory({ scope, name: trimmed, color, icon });

      if (!result.ok) {
        toast.add({
          title: category
            ? "Could not update the category"
            : "Could not add the category",
          description: result.error,
          type: "error",
        });
        return;
      }

      onSaved(result.data);
      onOpenChange(false);
      toast.add({
        title: category ? "Category updated" : "Category added",
        description: `${result.data.name} is ready to use.`,
        type: "success",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit category" : "New category"}
          </DialogTitle>
          <DialogDescription>
            {CATEGORY_SCOPE_LABELS[scope]} categories keep this module separate
            from your other palettes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              maxLength={CATEGORY_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
              placeholder="e.g. Deep work"
              className="h-10 rounded-xl"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colour</Label>
            <ColorSwatchPicker
              value={color}
              onChange={setColor}
              className="gap-2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
              {CATEGORY_ICON_OPTIONS.map((option) => {
                const selected = icon === option.name;

                return (
                  <button
                    key={option.name}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selected}
                    onClick={() => setIcon(option.name)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-card",
                    )}
                  >
                    <CategoryIcon name={option.name} className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                categoryTones[color].chip,
              )}
            >
              <CategoryIcon name={icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {name.trim() || "Category preview"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {CATEGORY_SCOPE_LABELS[scope]}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {category ? "Save changes" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CategoriesSection({
  initialCategories,
}: {
  initialCategories: CalendarCategory[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [scope, setScope] = useState<CategoryScope>("calendar");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const counts = useMemo(() => {
    const next: Record<CategoryScope, number> = {
      calendar: 0,
      task: 0,
      note: 0,
      reminder: 0,
    };

    for (const category of categories) {
      next[category.scope] += 1;
    }

    return next;
  }, [categories]);

  const visible = useMemo(
    () =>
      categories
        .filter((category) => category.scope === scope)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, scope],
  );

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (category: CalendarCategory) => {
    setEditing(category);
    setEditorOpen(true);
  };

  const handleSaved = (category: CalendarCategory) => {
    setCategories((current) => {
      const exists = current.some((item) => item.id === category.id);
      const next = exists
        ? current.map((item) => (item.id === category.id ? category : item))
        : [...current, category];

      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const result = await deleteSettingsCategory(deleteTarget.id);

      if (!result.ok) {
        toast.add({
          title: "Could not delete the category",
          description: result.error,
          type: "error",
        });
        return;
      }

      setCategories((current) =>
        current.filter((item) => item.id !== result.data.id),
      );
      toast.add({
        title: "Category deleted",
        description: `${deleteTarget.name} was removed from your palette.`,
        type: "success",
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SettingsSection
        title="Categories"
        description="Custom labels for calendar events, tasks, notes and reminders."
        icon={Tags}
        iconClassName="text-violet-500 dark:text-violet-400"
      >
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_SCOPES.map((item) => {
            const active = scope === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setScope(item)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                  active
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-md text-[10px] font-semibold",
                    scopeStyles[item],
                  )}
                >
                  {counts[item]}
                </span>
                {CATEGORY_SCOPE_LABELS[item]}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center">
              <p className="text-[13px] font-medium">No categories yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Add one to colour this part of your workspace.
              </p>
            </div>
          ) : null}

          {visible.map((category) => {
            const tone = categoryTones[category.color] ?? categoryTones.sky;

            return (
              <div
                key={category.id}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    tone.chip,
                  )}
                >
                  <CategoryIcon name={category.icon} className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {category.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {CATEGORY_SCOPE_LABELS[category.scope]}
                  </p>
                </div>

                <span
                  className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                  aria-hidden="true"
                />

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(category)}
                    aria-label={`Edit ${category.name}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(category)}
                    aria-label={`Delete ${category.name}`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Deleting a category never deletes the notes, tasks or events that
            used it.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-8 shrink-0 rounded-lg text-xs"
            onClick={openCreate}
          >
            <Plus />
            Add {CATEGORY_SCOPE_LABELS[scope].split(" ")[0].toLowerCase()}
          </Button>
        </div>
      </SettingsSection>

      <CategoryDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        scope={scope}
        category={editing}
        onSaved={handleSaved}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              will be removed from your palette. Notes, tasks and entries keep
              their content but lose this label.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Keep category
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Check />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
