"use client";

import { PricingTable } from "@clerk/nextjs";
import {
  ArrowLeft,
  Check,
  Crown,
  Infinity as InfinityIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FREE_PLAN_LIMITS } from "@/lib/billing/types";

const freeFeatures = [
  `${FREE_PLAN_LIMITS.notes} notes`,
  `${FREE_PLAN_LIMITS.spaces} spaces`,
  `${FREE_PLAN_LIMITS.boards} Kanban boards`,
  `${FREE_PLAN_LIMITS.calendar} calendar entries`,
  "AI Refine, Assistant, diagrams and templates",
  "Gemini 3.6 Flash",
];

const proFeatures = [
  "Unlimited notes",
  "Unlimited spaces",
  "Unlimited Kanban boards",
  "Unlimited calendar entries",
  "Gemini 3.6 Pro for deeper drafting",
  "Priority access to new AI surfaces",
];

export function PricingView({
  billingConfigured,
  isPro,
}: {
  billingConfigured: boolean;
  isPro: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 rounded-lg text-xs text-muted-foreground"
          render={<Link href="/settings" />}
        >
          <ArrowLeft />
          Back to settings
        </Button>
      </div>

      <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-5 py-8 text-center sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -left-24 -top-32 size-72 rounded-full bg-gradient-to-br from-sky-300/35 via-violet-300/25 to-transparent blur-3xl dark:from-sky-500/10" />
        <div className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full bg-gradient-to-br from-orange-300/40 via-rose-300/25 to-transparent blur-3xl dark:from-orange-500/10" />

        <div className="relative">
          <Badge
            variant="secondary"
            className="border-0 bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
          >
            <Sparkles className="size-3" />
            Flowbase plans
          </Badge>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Room to think, room to grow
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            Start free with the full workspace. Upgrade when you want unlimited
            space and Flowbase&apos;s most capable AI model.
          </p>
          {isPro ? (
            <Badge
              variant="secondary"
              className="mt-4 border-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            >
              <Crown className="size-3" />
              You are on Pro
            </Badge>
          ) : null}
        </div>
      </header>

      {billingConfigured ? (
        <div className="min-w-0 overflow-x-auto rounded-2xl">
          <PricingTable for="user" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            cadence="forever"
            description="Everything you need to build a calm, focused workspace."
            features={freeFeatures}
            current={!isPro}
            icon={<Sparkles className="size-4" />}
          />
          <PlanCard
            name="Pro"
            price="$12"
            cadence="per month"
            description="Unlimited room and the sharpest Flowbase AI."
            features={proFeatures}
            highlighted
            icon={<Crown className="size-4" />}
            footer={
              <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                Connect Clerk Billing to enable checkout. The plan comparison
                stays visible so you can preview what Pro unlocks.
              </p>
            }
          />
        </div>
      )}

      <p className="text-center text-[11.5px] text-muted-foreground">
        Plans are billed securely through Clerk. Cancel any time.
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  description,
  features,
  current = false,
  highlighted = false,
  icon,
  footer,
}: {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  current?: boolean;
  highlighted?: boolean;
  icon: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section
      className={
        highlighted
          ? "relative overflow-hidden rounded-2xl bg-gradient-to-b from-orange-50 to-card p-5 ring-1 ring-orange-300/50 dark:from-orange-500/10 dark:ring-orange-500/25"
          : "rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
      }
    >
      {highlighted ? (
        <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-orange-300/30 blur-2xl dark:bg-orange-500/10" />
      ) : null}

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              highlighted
                ? "flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                : "flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            }
          >
            {icon}
          </span>
          {current ? (
            <Badge
              variant="secondary"
              className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              Current plan
            </Badge>
          ) : null}
          {highlighted ? (
            <Badge
              variant="secondary"
              className="border-0 bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
            >
              Best value
            </Badge>
          ) : null}
        </div>

        <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight">
          {name}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-semibold tracking-tight">
            {price}
          </span>
          <span className="text-[11.5px] text-muted-foreground">{cadence}</span>
        </div>

        <ul className="mt-5 flex flex-col gap-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-[12.5px] text-muted-foreground"
            >
              <span
                className={
                  highlighted
                    ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300"
                    : "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                }
              >
                {feature.startsWith("Unlimited") ? (
                  <InfinityIcon className="size-2.5" />
                ) : (
                  <Check className="size-2.5" />
                )}
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </section>
  );
}
