"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Eraser,
  Loader2,
  Menu,
  MoreHorizontal,
  Pencil,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhiteboardColorPicker } from "@/components/whiteboard/whiteboard-color-picker";
import type { WhiteboardSaveStatus } from "@/lib/whiteboard/types";

type WhiteboardTopbarProps = {
  name: string;
  saveStatus: WhiteboardSaveStatus;
  exporting: boolean;
  onOpenAi: () => void;
  onExport: () => void;
  onAddSticky: (colorKey: string) => void;
  onApplyStroke: (color: string) => void;
  onApplyBackground: (color: string) => void;
  onApplyText: (color: string) => void;
  onOpenRename: () => void;
  onOpenDelete: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  onOpenMobileList?: () => void;
};

export function WhiteboardTopbar({
  name,
  saveStatus,
  exporting,
  onOpenAi,
  onExport,
  onAddSticky,
  onApplyStroke,
  onApplyBackground,
  onApplyText,
  onOpenRename,
  onOpenDelete,
  onDuplicate,
  onClear,
  onOpenMobileList,
}: WhiteboardTopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const showSaving = saveStatus === "saving";
  const showSaved = saveStatus === "saved";
  const showUnsaved = saveStatus === "unsaved";
  const showError = saveStatus === "error";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2 pl-1">
        <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 sm:flex dark:bg-emerald-500/15 dark:text-emerald-300">
          <StickyNote className="size-3.5" />
        </span>
        <h1 className="truncate font-heading text-[15px] font-semibold tracking-tight">
          {name}
        </h1>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-1">
        {onOpenMobileList ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenMobileList}
            aria-label="Open whiteboard list"
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="size-4" />
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAddSticky("honey")}
          aria-label="Add sticky note"
          title="Sticky note"
          className="text-muted-foreground hover:text-foreground"
        >
          <StickyNote className="size-4" />
        </Button>

        <WhiteboardColorPicker
          open={colorPickerOpen}
          onOpenChange={setColorPickerOpen}
          onApplyStroke={onApplyStroke}
          onApplyBackground={onApplyBackground}
          onApplyText={onApplyText}
          onAddSticky={onAddSticky}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAi}
          className="h-8 gap-1.5 rounded-xl px-2.5 text-[12px]"
        >
          <Sparkles className="size-3.5 text-violet-500" />
          <span className="hidden sm:inline">AI Diagram</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exporting}
          className="h-8 gap-1.5 rounded-xl px-2.5 text-[12px]"
        >
          {exporting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span className="hidden sm:inline">Export PNG</span>
        </Button>

        <div className="mx-1 hidden h-5 w-px bg-border md:block" />

        <div
          className="mr-1 hidden items-center gap-1.5 md:flex"
          role="status"
          aria-live="polite"
        >
          {showSaving ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Saving…
            </span>
          ) : showSaved ? (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Saved
            </span>
          ) : showUnsaved ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-2 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          ) : showError ? (
            <span className="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertTriangle className="size-3.5" />
              Save failed
            </span>
          ) : null}
        </div>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Whiteboard options"
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenRename}>
              <Pencil />
              Rename whiteboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy />
              Duplicate whiteboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClear}>
              <Eraser />
              Clear canvas
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onOpenDelete}>
              <Trash2 />
              Delete whiteboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
