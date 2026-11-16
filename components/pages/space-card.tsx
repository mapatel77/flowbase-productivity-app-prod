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

type SpaceCardProps = {
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

/** A single space in the spaces grid. */
export function SpaceCard({
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
}: SpaceCardProps) {
  const tone = categoryTones[space.color];

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_6%,transparent),0_12px_28px_-18px_color-mix(in_oklch,var(--foreground)_38%,transparent)] transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_6%,transparent),0_18px_36px_-18px_color-mix(in_oklch,var(--foreground)_45%,transparent)]">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone.chip,
          )}
        >
          <Folder className="size-5" />
        </span>

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
      </div>

      <div className="min-w-0">
        <Link
          href={`/pages/${space.id}`}
          className="after:absolute after:inset-0 after:content-[''] font-heading text-[15px] font-semibold tracking-tight hover:underline"
        >
          {space.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
          {space.description || "No description yet"}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
        <SpaceMemberAvatars members={space.members} />
        <span className="text-[11px] font-medium text-muted-foreground">
          {space.pageCount} {space.pageCount === 1 ? "Page" : "Pages"}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Updated <RelativeTime value={space.updatedAt} />
      </p>
    </article>
  );
}
