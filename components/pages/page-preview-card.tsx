"use client";

import {
  ArrowUpRight,
  ListChecks,
  MessageSquare,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RelativeTime } from "@/components/notes/relative-time";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { categoryTones } from "@/lib/calendar/colors";
import { getUserInitials } from "@/lib/liveblocks/user-color";
import { getTemplateOption } from "@/lib/pages/templates";
import type { SpacePage } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type PagePreviewCardProps = {
  page: SpacePage;
  spaceName: string;
  spaceColor: string;
  /** The page actions menu, rendered in the header. */
  actions?: ReactNode;
  /** Used when the card is shown inside the space view. */
  onOpen?: () => void;
};

/** The quick preview shown when a page is selected. */
export function PagePreviewCard({
  page,
  spaceName,
  spaceColor,
  actions,
  onOpen,
}: PagePreviewCardProps) {
  const template = getTemplateOption(page.template);
  const TemplateIcon = template.icon;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold tracking-tight">
            {page.title || "Untitled page"}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                categoryTones[
                  (spaceColor as keyof typeof categoryTones) ?? "violet"
                ]?.dot,
              )}
              aria-hidden="true"
            />
            <span className="truncate">{spaceName}</span>
          </p>
        </div>

        {actions}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className="h-6 gap-1.5 rounded-full px-2.5 text-[11px]"
        >
          <TemplateIcon className="size-3.5" />
          {template.label}
        </Badge>
        {page.archived ? (
          <Badge
            variant="outline"
            className="h-6 rounded-full px-2.5 text-[11px] text-muted-foreground"
          >
            Archived
          </Badge>
        ) : null}
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {page.description ||
          "No description yet — add one so people know what this page covers."}
      </p>

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            <MessageSquare className="size-3" />
            Comments
          </dt>
          <dd className="mt-0.5 font-heading text-lg font-semibold tracking-tight">
            {page.commentsCount}
          </dd>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            <ListChecks className="size-3" />
            Linked tasks
          </dt>
          <dd className="mt-0.5 font-heading text-lg font-semibold tracking-tight">
            {page.linkedTasksCount}
          </dd>
        </div>
      </dl>

      <div className="flex items-center gap-2 border-t border-border/60 pt-3">
        <Avatar size="sm">
          <AvatarFallback className="text-[9px] font-semibold">
            {getUserInitials(page.lastEditedByName, "You")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium">
            {page.lastEditedByName ?? "You"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Last edited <RelativeTime value={page.updatedAt} />
          </p>
        </div>
      </div>

      {onOpen ? (
        <Link
          href={`/pages/${page.spaceId}/${page.id}`}
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-600 hover:underline dark:text-violet-400"
        >
          <Pencil className="size-3.5" />
          Open page
          <ArrowUpRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
