import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  NotebookPen,
  Presentation,
  Sparkles,
  SquareKanban,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardFeature,
  DashboardFeatureKey,
  DashboardFeatureStatus,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type FeatureVisual = {
  icon: LucideIcon;
  iconClassName: string;
  surfaceClassName: string;
};

const featureVisuals: Record<DashboardFeatureKey, FeatureVisual> = {
  calendar: {
    icon: CalendarDays,
    iconClassName: "text-rose-500 dark:text-rose-400",
    surfaceClassName: "bg-rose-100 dark:bg-rose-500/15",
  },
  tasks: {
    icon: SquareKanban,
    iconClassName: "text-sky-500 dark:text-sky-400",
    surfaceClassName: "bg-sky-100 dark:bg-sky-500/15",
  },
  notes: {
    icon: NotebookPen,
    iconClassName: "text-amber-500 dark:text-amber-400",
    surfaceClassName: "bg-amber-100 dark:bg-amber-500/15",
  },
  whiteboard: {
    icon: Presentation,
    iconClassName: "text-emerald-500 dark:text-emerald-400",
    surfaceClassName: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  "ai-assistant": {
    icon: Sparkles,
    iconClassName: "text-violet-500 dark:text-violet-400",
    surfaceClassName: "bg-violet-100 dark:bg-violet-500/15",
  },
  "template-builder": {
    icon: WandSparkles,
    iconClassName: "text-fuchsia-500 dark:text-fuchsia-400",
    surfaceClassName: "bg-fuchsia-100 dark:bg-fuchsia-500/15",
  },
};

const statusStyles: Record<
  DashboardFeatureStatus,
  { badge: string; dot: string; label: string }
> = {
  active: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Active",
  },
  ready: {
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
    label: "Ready",
  },
  disabled: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    label: "Unavailable",
  },
  error: {
    badge: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    dot: "bg-destructive",
    label: "Needs attention",
  },
};

function FeatureStatusCards({ features }: { features: DashboardFeature[] }) {
  return (
    <section aria-labelledby="feature-status-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="feature-status-title"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            Your workspace
          </h2>
          <p className="text-xs text-muted-foreground">
            Everything you use, with a quick pulse on each tool.
          </p>
        </div>
        <Badge variant="outline" className="bg-card/70 text-muted-foreground">
          {features.length} tools
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const visual = featureVisuals[feature.key];
          const status = statusStyles[feature.status];
          const Icon = visual.icon;

          return (
            <Card
              key={feature.key}
              className="cozy-card group gap-0 overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_color-mix(in_oklch,var(--foreground)_38%,transparent)]"
            >
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      visual.surfaceClassName,
                    )}
                  >
                    <Icon
                      className={cn("size-5", visual.iconClassName)}
                      aria-hidden="true"
                    />
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn("gap-1.5", status.badge)}
                  >
                    <span
                      className={cn("size-1.5 rounded-full", status.dot)}
                      aria-hidden="true"
                    />
                    {feature.statusLabel || status.label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="font-semibold">{feature.name}</CardTitle>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {feature.stats.map((stat) => (
                      <span
                        key={`${feature.key}-${stat.label}`}
                        className="text-[11px] text-muted-foreground"
                      >
                        <span className="font-semibold text-foreground">
                          {stat.value}
                        </span>{" "}
                        {stat.label}
                      </span>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex items-center justify-between gap-3 pt-0">
                <span className="text-[11px] text-muted-foreground">
                  {feature.stats.length > 0
                    ? "Live workspace status"
                    : "Ready when you are"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 rounded-lg text-xs text-primary hover:bg-primary/10"
                  render={<Link href={feature.href} />}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export { FeatureStatusCards };
