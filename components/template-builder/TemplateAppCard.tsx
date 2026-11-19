"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteTemplateApp } from "@/app/template-builder/actions";
import { setSidebarPosition } from "@/app/template-builder/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import type { TemplateApp } from "@/lib/template-builder/types";
import { cn } from "@/lib/utils";

type TemplateAppCardProps = {
  app: TemplateApp;
  onChange: () => void;
};

export function TemplateAppCard({ app, onChange }: TemplateAppCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteTemplateApp(app.id);
    if (!result.ok) {
      toast.add({ title: "Could not delete", description: result.error, type: "error" });
      return;
    }
    setDeleteOpen(false);
    onChange();
    toast.add({ title: "Deleted", description: `"${app.appName}" removed.` });
  };

  const handlePin = async (position: number | null) => {
    const result = await setSidebarPosition({ id: app.id, position });
    if (!result.ok) {
      toast.add({ title: "Could not update sidebar", description: result.error, type: "error" });
      return;
    }
    onChange();
    toast.add({
      title: position === null ? "Removed from sidebar" : "Added to sidebar",
      description: app.appName,
    });
  };

  return (
    <Card
      key={app.id}
      className={cn(
        "cozy-card group relative",
        app.id && "hover:shadow-[0_10px_24px_-16px_color-mix(in_oklch,var(--foreground)_45%,transparent)]",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <CardTitle className="text-sm font-medium">{app.appName}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handlePin(app.sidebarPosition ? null : 0)}>
              {app.sidebarPosition !== null ? "Remove from Sidebar" : "Add to Sidebar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-border",
              app.color === "sky"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
            )}
          >
            {app.appName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Created {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <a href={`/template-builder/${app.id}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted text-sm text-foreground transition-colors text-[0.8rem]">
            Preview
          </a>
          <BadgeColor color={app.color} />
        </div>
      </CardContent>

      {deleteOpen && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          appName={app.appName}
          onConfirm={handleDelete}
        />
      )}
    </Card>
  );
}

function BadgeColor({ color }: { color: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 text-[10px] font-semibold",
        color === "sky" ? "bg-sky-100 text-sky-700 border-sky-200/60" : "bg-indigo-100 text-indigo-700 border-indigo-200/60",
      )}
    >
      {color.charAt(0).toUpperCase()}
    </span>
  );
}

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  appName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/25" onClick={() => onOpenChange(false)} />
      <div className="bg-popover p-6 rounded-xl shadow-lg border border-border w-full max-w-xs mx-4">
        <h3 id="template-delete-title" className="font-heading text-base font-semibold mb-1">
          Delete “{appName}”?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          This cannot be undone. The app will also be removed from your sidebar if pinned.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
