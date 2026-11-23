import { formatDistanceToNow, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  FileText,
  LayoutTemplate,
  NotebookPen,
  Presentation,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardRecentItem,
  DashboardRecentType,
} from "@/lib/dashboard/types";
import { categoryTones } from "@/lib/calendar/colors";
import { cn } from "@/lib/utils";

const recentVisuals: Record<
  DashboardRecentType,
  { icon: LucideIcon; label: string; iconClassName: string }
> = {
  note: {
    icon: NotebookPen,
    label: "Note",
    iconClassName: "text-amber-500 dark:text-amber-400",
  },
  whiteboard: {
    icon: Presentation,
    label: "Whiteboard",
    iconClassName: "text-emerald-500 dark:text-emerald-400",
  },
  board: {
    icon: SquareKanban,
    label: "Board",
    iconClassName: "text-sky-500 dark:text-sky-400",
  },
  template: {
    icon: LayoutTemplate,
    label: "Template",
    iconClassName: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  page: {
    icon: FileText,
    label: "Page",
    iconClassName: "text-indigo-500 dark:text-indigo-400",
  },
};

function getUpdatedLabel(updatedAt: string): string {
  try {
    return formatDistanceToNow(parseISO(updatedAt), { addSuffix: true });
  } catch {
    return "Recently updated";
  }
}

export function RecentItems({ items }: { items: DashboardRecentItem[] }) {
  return (
    <Card className="cozy-card h-full gap-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-semibold">Recently updated</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick up where you left off across your workspace.
            </p>
          </div>
          <Badge variant="outline" className="bg-card/70 text-muted-foreground">
            {items.length} items
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <Empty className="border border-dashed border-border/80 bg-muted/20 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="size-5" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No recent work yet</EmptyTitle>
              <EmptyDescription>
                Notes, boards, pages and templates you update will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {items.map((item) => {
              const visual = recentVisuals[item.type];
              const Icon = visual.icon;
              const tone = categoryTones[item.color];

              return (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="group flex min-h-16 items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition-[background-color,border-color] hover:border-border/70 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        tone.chip,
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="capitalize">{visual.label}</span>
                        {item.subtitle ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{item.subtitle}</span>
                          </>
                        ) : null}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] text-muted-foreground">
                        {getUpdatedLabel(item.updatedAt)}
                      </span>
                      <ArrowUpRight
                        className="ml-auto mt-1 size-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
