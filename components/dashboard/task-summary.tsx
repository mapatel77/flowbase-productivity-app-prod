import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  ListTodo,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardTaskSummary } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export function TaskSummary({ summary }: { summary: DashboardTaskSummary }) {
  const stats = [
    {
      label: "Total",
      value: summary.total,
      icon: ListTodo,
      className: "text-sky-600 dark:text-sky-300",
      iconClassName: "bg-sky-100 dark:bg-sky-500/15",
    },
    {
      label: "Completed",
      value: summary.completed,
      icon: CheckCircle2,
      className: "text-emerald-600 dark:text-emerald-300",
      iconClassName: "bg-emerald-100 dark:bg-emerald-500/15",
    },
    {
      label: "Pending",
      value: summary.pending,
      icon: CircleDashed,
      className: "text-amber-600 dark:text-amber-300",
      iconClassName: "bg-amber-100 dark:bg-amber-500/15",
    },
    {
      label: "Overdue",
      value: summary.overdue,
      icon: TriangleAlert,
      className: "text-rose-600 dark:text-rose-300",
      iconClassName: "bg-rose-100 dark:bg-rose-500/15",
    },
  ];

  return (
    <Card className="cozy-card h-full gap-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-semibold">Task snapshot</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Your workload at a glance.
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
            <ListTodo className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border/60 bg-card/60 p-3"
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg",
                    stat.iconClassName,
                    stat.className,
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <p className="mt-2 font-heading text-xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium">Overall progress</span>
            <Badge variant="secondary" className="bg-muted/70 text-foreground">
              {summary.progress}%
            </Badge>
          </div>
          <Progress
            value={summary.progress}
            aria-label={`${summary.progress}% of tasks completed`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/45 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock3 className="size-3.5" aria-hidden="true" />
            This week
          </span>
          <span className="text-[11px] font-medium">
            {summary.weeklyCompleted} of {summary.weeklyTotal} complete ·{" "}
            {summary.weeklyProgress}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
