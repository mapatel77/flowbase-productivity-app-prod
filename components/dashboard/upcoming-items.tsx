import { format, parseISO } from "date-fns";
import {
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ListTodo,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardUpcomingItem } from "@/lib/dashboard/types";
import { categoryTones, neutralTone } from "@/lib/calendar/colors";
import { cn } from "@/lib/utils";

function getDateLabel(date: string): string {
  try {
    return format(parseISO(date), "EEE, MMM d");
  } catch {
    return date;
  }
}

function getTimeLabel(time: string | null): string {
  if (!time) return "All day";
  try {
    return format(parseISO(`2000-01-01T${time}`), "h:mm a");
  } catch {
    return time;
  }
}

export function UpcomingItems({ items }: { items: DashboardUpcomingItem[] }) {
  return (
    <Card className="cozy-card h-full gap-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-semibold">Coming up</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Your next tasks and reminders, in one calm list.
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <CalendarClock className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <Empty className="border border-dashed border-border/80 bg-muted/20 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Your schedule is clear</EmptyTitle>
              <EmptyDescription>
                Upcoming tasks and reminders will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="space-y-1">
            {items.map((item) => {
              const tone = item.color ? categoryTones[item.color] : neutralTone;
              const isTask = item.kind === "task";
              const ItemIcon = isTask ? ListTodo : BellRing;

              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl",
                      tone.chip,
                    )}
                  >
                    <ItemIcon className="size-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.categoryName ? (
                        <Badge
                          variant="secondary"
                          className={cn("hidden max-w-32 truncate sm:inline-flex", tone.chip)}
                        >
                          {item.categoryName}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {getDateLabel(item.date)} · {getTimeLabel(item.time)}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="hidden shrink-0 bg-card/70 capitalize sm:inline-flex"
                  >
                    {item.kind}
                  </Badge>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
