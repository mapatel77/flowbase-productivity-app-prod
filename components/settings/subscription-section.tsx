"use client";

import {
  BookOpen,
  CalendarDays,
  Crown,
  FolderOpen,
  SquareKanban,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import {
  SettingsDivider,
  SettingsSection,
} from "@/components/settings/settings-section";
import { ManageSubscriptionButton } from "@/components/settings/subscription-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PLAN_LIMIT_KEYS,
  PLAN_LIMIT_LABELS,
  type BillingStatus,
  type PlanLimitKey,
  type PlanSnapshot,
} from "@/lib/billing/types";
import { cn } from "@/lib/utils";

const usageIcons: Record<PlanLimitKey, LucideIcon> = {
  notes: BookOpen,
  spaces: FolderOpen,
  boards: SquareKanban,
  calendar: CalendarDays,
};

const statusLabels: Record<BillingStatus, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  ended: "Ended",
  none: "Active",
};

function statusClass(status: BillingStatus) {
  if (status === "past_due" || status === "ended") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  }

  if (status === "canceled") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }

  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
}

export function SubscriptionSection({
  plan,
  billingEnabled,
}: {
  plan: PlanSnapshot;
  billingEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <div
          className={cn(
            "pointer-events-none absolute -right-20 -top-24 size-64 rounded-full blur-3xl",
            plan.isPro
              ? "bg-gradient-to-br from-amber-300/50 via-orange-300/30 to-transparent dark:from-amber-500/15"
              : "bg-gradient-to-br from-sky-300/40 via-violet-300/25 to-transparent dark:from-sky-500/10",
          )}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  plan.isPro
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {plan.isPro ? (
                  <Crown className="size-5" />
                ) : (
                  <Sparkles className="size-5" />
                )}
              </span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Current plan
                </p>
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  Flowbase {plan.name}
                </h2>
              </div>
              <Badge
                variant="secondary"
                className={cn("border-0", statusClass(plan.status))}
              >
                {statusLabels[plan.status]}
              </Badge>
            </div>

            <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-muted-foreground">
              {plan.isPro
                ? "Unlimited notes, spaces, boards and calendar entries, plus Gemini 3.6 Pro in every AI surface."
                : "A calm place to start. Free includes generous limits and the full Flowbase workspace."}
            </p>

            {plan.renewalDate ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {plan.status === "canceled" ? "Access ends" : "Renews"} on{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(plan.renewalDate), "MMM d, yyyy")}
                </span>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {plan.isPro && billingEnabled ? (
              <ManageSubscriptionButton className="h-9 rounded-xl" />
            ) : null}
            {!plan.isPro ? (
              <Button
                render={<Link href="/pricing" />}
                className="h-9 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 text-white hover:from-orange-600 hover:to-rose-600"
              >
                <TrendingUp />
                Upgrade to Pro
              </Button>
            ) : null}
          </div>
        </div>

        {!plan.enforced ? (
          <p className="relative mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {plan.demo
              ? "Running in local demo mode. Plan limits are shown for reference and are not enforced until Clerk is connected."
              : "Clerk Billing is not enabled in this environment, so limits are shown for reference and are not enforced."}
          </p>
        ) : null}
      </section>

      <SettingsSection
        title="Usage this month"
        description={
          plan.isPro
            ? "Pro keeps every workspace surface unlimited."
            : "A quick look at how much of your Free plan you have used."
        }
        icon={TrendingUp}
        iconClassName="text-sky-500 dark:text-sky-400"
      >
        <div className="flex flex-col divide-y divide-border/60">
          {PLAN_LIMIT_KEYS.map((key) => {
            const Icon = usageIcons[key];
            const used = plan.usage[key];
            const limit = plan.limits[key];
            const percent =
              limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
            const atLimit = limit !== null && used >= limit;

            return (
              <div key={key} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium">
                    {PLAN_LIMIT_LABELS[key]}
                  </span>
                  <span
                    className={cn(
                      "ml-auto text-[12px] tabular-nums text-muted-foreground",
                      atLimit && "font-medium text-rose-500",
                    )}
                  >
                    {used}
                    {limit === null ? " · Unlimited" : ` / ${limit}`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      plan.isPro
                        ? "bg-emerald-400"
                        : atLimit
                          ? "bg-rose-400"
                          : "bg-primary",
                    )}
                    style={{ width: `${plan.isPro ? 100 : percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <SettingsDivider />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">
            {plan.isPro
              ? "Need to change billing details or cancel? Everything is handled by Clerk."
              : "Upgrade any time. Your notes, boards and spaces stay exactly where they are."}
          </p>
          <Button
            variant="outline"
            className="h-8 rounded-lg text-xs"
            render={<Link href="/pricing" />}
          >
            Compare plans
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
