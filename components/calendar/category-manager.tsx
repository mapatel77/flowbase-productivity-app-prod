"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { ColorSwatchPicker } from "@/components/calendar/category-picker";
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
import { categoryTones, type ColorToken } from "@/lib/calendar/colors";
import type { CalendarCategory } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type CategoryManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CalendarCategory[];
  onCreate: (name: string, color: ColorToken) => Promise<void>;
  onUpdate: (id: number, name: string, color: ColorToken) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

type Row = { id: number; name: string; color: ColorToken };

/** Lets people rename, recolour and delete their categories. */
export function CategoryManager({
  open,
  onOpenChange,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<ColorToken>("sky");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
      })),
    );
  }, [open, categories]);

  const saveRow = async (row: Row) => {
    const name = row.name.trim();
    if (!name) return;

    setBusy(true);
    try {
      await onUpdate(row.id, name, row.color);
    } finally {
      setBusy(false);
    }
  };

  const removeRow = async (id: number) => {
    setBusy(true);
    try {
      await onDelete(id);
      setRows((current) => current.filter((row) => row.id !== id));
    } finally {
      setBusy(false);
    }
  };

  const addRow = async () => {
    const name = newName.trim();
    if (!name) return;

    setBusy(true);
    try {
      await onCreate(name, newColor);
      setNewName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
          <DialogDescription>
            Rename a category or give it a different colour. Tasks keep their
            details when a category is removed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto pr-1">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
              No categories yet. Add your first one below.
            </p>
          ) : null}

          {rows.map((row) => {
            const tone = categoryTones[row.color] ?? categoryTones.sky;

            return (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      tone.dot,
                    )}
                  />
                  <Input
                    value={row.name}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                    onBlur={() => saveRow(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveRow(row);
                      }
                    }}
                    aria-label="Category name"
                    className="h-8 flex-1 rounded-lg border-border/70 bg-card/70"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    onClick={() => removeRow(row.id)}
                    aria-label={`Delete ${row.name}`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>

                <ColorSwatchPicker
                  value={row.color}
                  onChange={(color) => {
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id ? { ...item, color } : item,
                      ),
                    );
                    saveRow({ ...row, color });
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-2.5">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addRow();
                }
              }}
              placeholder="New category name"
              aria-label="New category name"
              className="h-8 flex-1 rounded-lg border-border/70 bg-card/70"
            />
            <Button
              size="sm"
              disabled={busy || !newName.trim()}
              onClick={addRow}
              className="h-8 gap-1.5 rounded-lg"
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>

          <ColorSwatchPicker value={newColor} onChange={setNewColor} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
