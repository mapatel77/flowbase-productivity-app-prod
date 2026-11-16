"use client";

import {
  Archive,
  Copy,
  FilePlus2,
  MoreHorizontal,
  Palette,
  Pencil,
  Trash2,
  UserPlus,
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
import type { Space } from "@/lib/pages/types";

type SpaceActionsMenuProps = {
  space: Space;
  /** Only the owner can rename, share, archive or delete a space. */
  canManage: boolean;
  onRename: () => void;
  onChangeColor: () => void;
  onAddPage: () => void;
  onInvite: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  /** Replaces the default icon button trigger. */
  trigger?: ReactElement;
};

/** The “…” menu shared by the space grid, the space list and the space header. */
export function SpaceActionsMenu({
  space,
  canManage,
  onRename,
  onChangeColor,
  onAddPage,
  onInvite,
  onDuplicate,
  onArchive,
  onDelete,
  trigger,
}: SpaceActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${space.name} options`}
              className="text-muted-foreground hover:text-foreground"
            />
          )
        }
      >
        {trigger ? null : <MoreHorizontal />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onAddPage}>
          <FilePlus2 />
          Add page
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInvite}>
          <UserPlus />
          Invite collaborators
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy />
          Duplicate space
        </DropdownMenuItem>

        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRename}>
              <Pencil />
              Rename space
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangeColor}>
              <Palette />
              Change colour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              <Archive />
              {space.archived ? "Restore space" : "Archive space"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Delete space
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
