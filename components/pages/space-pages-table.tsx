"use client";

import { FileText, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RelativeTime } from "@/components/notes/relative-time";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryTones } from "@/lib/calendar/colors";
import { getUserColor, getUserInitials } from "@/lib/liveblocks/user-color";
import { getTemplateOption } from "@/lib/pages/templates";
import type { SpacePage } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type SpacePagesTableProps = {
  pages: SpacePage[];
  selectedPageId: number | null;
  onSelect: (page: SpacePage) => void;
  onToggleFavorite: (page: SpacePage) => void;
  /** The actions menu rendered at the end of every row. */
  actionsFor: (page: SpacePage) => ReactNode;
};

/** The list of pages inside a space. */
export function SpacePagesTable({
  pages,
  selectedPageId,
  onSelect,
  onToggleFavorite,
  actionsFor,
}: SpacePagesTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Page name
            </TableHead>
            <TableHead className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Type
            </TableHead>
            <TableHead className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Last updated
            </TableHead>
            <TableHead className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Updated by
            </TableHead>
            <TableHead className="w-10" />
            <TableHead className="w-10 pr-4" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {pages.map((page) => {
            const template = getTemplateOption(page.template);
            const TemplateIcon = template.icon;
            const selected = page.id === selectedPageId;

            return (
              <TableRow
                key={page.id}
                aria-selected={selected}
                onClick={() => onSelect(page)}
                className={cn(
                  "cursor-pointer",
                  selected && "bg-violet-50/70 dark:bg-violet-500/10",
                )}
              >
                <TableCell className="max-w-[16rem] pl-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <FileText className="size-3.5" />
                    </span>
                    <Link
                      href={`/pages/${page.spaceId}/${page.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="truncate text-[13px] font-medium hover:underline"
                    >
                      {page.title || "Untitled page"}
                    </Link>
                    {page.archived ? (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Archived
                      </span>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <TemplateIcon className="size-3.5" />
                    {template.label}
                  </span>
                </TableCell>

                <TableCell className="text-[12px] text-muted-foreground">
                  <RelativeTime value={page.updatedAt} />
                </TableCell>

                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <Avatar size="sm">
                      <AvatarFallback
                        className={cn(
                          "text-[9px] font-semibold",
                          categoryTones[
                            getUserColor(page.lastEditedByName ?? "You")
                          ].chip,
                        )}
                      >
                        {getUserInitials(page.lastEditedByName, "You")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[12px] text-muted-foreground">
                      {page.lastEditedByName ?? "You"}
                    </span>
                  </span>
                </TableCell>

                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={
                      page.favorite
                        ? `Remove ${page.title} from favourites`
                        : `Add ${page.title} to favourites`
                    }
                    aria-pressed={page.favorite}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(page);
                    }}
                    className={cn(
                      "text-muted-foreground hover:text-amber-500",
                      page.favorite && "text-amber-500",
                    )}
                  >
                    <Star
                      className="size-3.5"
                      fill={page.favorite ? "currentColor" : "none"}
                    />
                  </Button>
                </TableCell>

                <TableCell
                  className="pr-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actionsFor(page)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
