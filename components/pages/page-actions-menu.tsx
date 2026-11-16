"use client";

import {
  Archive,
  Copy,
  Download,
  FolderInput,
  Link2,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SpacePage } from "@/lib/pages/types";

type PageActionsMenuProps = {
  page: SpacePage;
  canEdit: boolean;
  onRename: () => void;
  onMove: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onExport: () => void;
  onArchive: () => void;
  onDelete: () => void;
  /** Replaces the default icon button trigger. */
  trigger?: ReactElement;
};

/** The “…” menu with every action a page supports. */
export function PageActionsMenu({
  page,
  canEdit,
  onRename,
  onMove,
  onDuplicate,
  onToggleFavorite,
  onShare,
  onExport,
  onArchive,
  onDelete,
  trigger,
}: PageActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${page.title} options`}
              className="text-muted-foreground hover:text-foreground"
            />
          )
        }
      >
        {trigger ? null : <MoreHorizontal />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onRename} disabled={!canEdit}>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMove} disabled={!canEdit}>
          <FolderInput />
          Move to space
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate} disabled={!canEdit}>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleFavorite}>
          <Star />
          {page.favorite ? "Remove favourite" : "Favourite"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onShare}>
          <Link2 />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          <Download />
          Export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onArchive} disabled={!canEdit}>
          <Archive />
          {page.archived ? "Restore page" : "Archive page"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete} disabled={!canEdit}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
