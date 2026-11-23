import type { LucideIcon } from "lucide-react";
import {
  BellPlus,
  NotebookPen,
  Plus,
  Presentation,
  Sparkles,
  SquareKanban,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  DashboardQuickAction,
  DashboardQuickActionKey,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type QuickActionVisual = {
  icon: LucideIcon;
  iconClassName: string;
  surfaceClassName: string;
};

const actionVisuals: Record<DashboardQuickActionKey, QuickActionVisual> = {
  "create-task": {
    icon: SquareKanban,
    iconClassName: "text-sky-500 dark:text-sky-400",
    surfaceClassName: "bg-sky-100 dark:bg-sky-500/15",
  },
  "add-reminder": {
    icon: BellPlus,
    iconClassName: "text-rose-500 dark:text-rose-400",
    surfaceClassName: "bg-rose-100 dark:bg-rose-500/15",
  },
  "create-note": {
    icon: NotebookPen,
    iconClassName: "text-amber-500 dark:text-amber-400",
    surfaceClassName: "bg-amber-100 dark:bg-amber-500/15",
  },
  "open-whiteboard": {
    icon: Presentation,
    iconClassName: "text-emerald-500 dark:text-emerald-400",
    surfaceClassName: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  "ask-ai": {
    icon: Sparkles,
    iconClassName: "text-violet-500 dark:text-violet-400",
    surfaceClassName: "bg-violet-100 dark:bg-violet-500/15",
  },
  "generate-template": {
    icon: WandSparkles,
    iconClassName: "text-fuchsia-500 dark:text-fuchsia-400",
    surfaceClassName: "bg-fuchsia-100 dark:bg-fuchsia-500/15",
  },
};

export function QuickActions({ actions }: { actions: DashboardQuickAction[] }) {
  return (
    <section aria-labelledby="quick-actions-title">
      <div className="mb-4">
        <h2
          id="quick-actions-title"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          Quick access
        </h2>
        <p className="text-xs text-muted-foreground">
          Jump straight to the place you need next.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const visual = actionVisuals[action.key];
          const Icon = visual.icon;

          return (
            <Card
              key={action.key}
              className="cozy-card gap-0 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_color-mix(in_oklch,var(--foreground)_38%,transparent)]"
            >
              <CardContent className="flex h-full items-center gap-3">
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

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{action.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {action.enabled
                      ? action.description
                      : (action.disabledReason ?? action.description)}
                  </p>
                </div>

                {action.enabled ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={action.name}
                    title={action.description}
                    className="shrink-0 rounded-lg text-primary hover:bg-primary/10"
                    render={<Link href={action.href} />}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    aria-label={`${action.name} is unavailable`}
                    title={action.disabledReason ?? action.description}
                    className="shrink-0 rounded-lg"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
