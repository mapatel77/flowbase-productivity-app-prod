import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Info,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardInsight,
  DashboardInsightTone,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const insightVisuals: Record<
  DashboardInsightTone,
  { icon: LucideIcon; className: string; surfaceClassName: string }
> = {
  info: {
    icon: Info,
    className: "text-sky-600 dark:text-sky-300",
    surfaceClassName: "bg-sky-100 dark:bg-sky-500/15",
  },
  success: {
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-300",
    surfaceClassName: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  warning: {
    icon: TriangleAlert,
    className: "text-amber-600 dark:text-amber-300",
    surfaceClassName: "bg-amber-100 dark:bg-amber-500/15",
  },
  neutral: {
    icon: Sparkles,
    className: "text-violet-600 dark:text-violet-300",
    surfaceClassName: "bg-violet-100 dark:bg-violet-500/15",
  },
};

export function InsightsList({ insights }: { insights: DashboardInsight[] }) {
  return (
    <Card className="cozy-card h-full gap-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-semibold">Flow insights</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Useful observations from your current workspace.
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Sparkles className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {insights.length === 0 ? (
          <Empty className="border border-dashed border-border/80 bg-muted/20 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles className="size-5" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No insights yet</EmptyTitle>
              <EmptyDescription>
                As your workspace changes, helpful observations will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {insights.map((insight) => {
              const visual = insightVisuals[insight.tone];
              const Icon = visual.icon;

              return (
                <li
                  key={insight.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      visual.surfaceClassName,
                      visual.className,
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
