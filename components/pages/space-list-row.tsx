"use client";

import Link from "next/link";
import { Folder, Star } from "lucide-react";

import { RelativeTime } from "@/components/notes/relative-time";
import { SpaceActionsMenu } from "@/components/pages/space-actions-menu";
import { SpaceMemberAvatars } from "@/components/pages/space-member-avatars";
import { Button } from "@/components/ui/button";
import { categoryTones } from "@/lib/calendar/colors";
import type { Space } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type SpaceListRowProps = {
  space: Space;
  canManage: boolean;
  onToggleFavorite: (space: Space) => void;
  onRename: (space: Space) => void;
  onChangeColor: (space: Space) => void;
  onAddPage: (space: Space) => void;
  onInvite: (space: Space) => void;
  onDuplicate: (space: Space) => void;
  onArchive: (space: Space) => void;
  onDelete: (space: Space) => void;
};

/** A single space in the spaces list view. */
export function SpaceListRow({
  space,
  canManage,
  onToggleFavorite,
  onRename,
  onChangeColor,
  onAddPage,
  onInvite,
  onDuplicate,
  onArchive,
  onDelete,
}: SpaceListRowProps) {
  const tone = categoryTones[space.color];

  return (
    <article className="group relative flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 transition-colors hover:border-border hover:bg-muted/20">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone.chip,
        )}
      >
        <Folder className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/pages/${space.id}`}
          className="after:absolute after:inset-0 after:content-[''] truncate font-heading text-sm font-semibold tracking-tight hover:underline"
        >
          {space.name}
        </Link>
        <p className="truncate text-[11px] text-muted-foreground">
          {space.description || "No description yet"}
        </p>
      </div>

      <div className="hidden w-24 shrink-0 text-[11px] text-muted-foreground md:block">
        {space.pageCount} {space.pageCount === 1 ? "Page" : "Pages"}
      </div>

      <SpaceMemberAvatars
        members={space.members}
        className="hidden lg:flex"
      />

      <div className="hidden w-28 shrink-0 text-[11px] text-muted-foreground lg:block">
        Updated <RelativeTime value={space.updatedAt} />
      </div>

      <div className="relative z-10 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={
            space.favorite
              ? `Remove ${space.name} from favourites`
              : `Add ${space.name} to favourites`
          }
          aria-pressed={space.favorite}
          title={space.favorite ? "Remove favourite" : "Add favourite"}
          onClick={() => onToggleFavorite(space)}
          className={cn(
            "text-muted-foreground hover:text-amber-500",
            space.favorite && "text-amber-500",
          )}
        >
          <Star
            className="size-3.5"
            fill={space.favorite ? "currentColor" : "none"}
          />
        </Button>

        <SpaceActionsMenu
          space={space}
          canManage={canManage}
          onRename={() => onRename(space)}
          onChangeColor={() => onChangeColor(space)}
          onAddPage={() => onAddPage(space)}
          onInvite={() => onInvite(space)}
          onDuplicate={() => onDuplicate(space)}
          onArchive={() => onArchive(space)}
          onDelete={() => onDelete(space)}
        />
      </div>
    </article>
  );
}
