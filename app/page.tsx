import {
  ArrowUpRight,
  BookOpen,
  Coffee,
  Layers,
  NotebookPen,
  Plus,
  Rocket,
  Sparkles,
  SquareKanban,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FocusList } from "@/components/dashboard/focus-list";
import { Greeting } from "@/components/dashboard/greeting";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = {
  chip: string;
  dot: string;
};

const tones: Record<string, Tone> = {
  sky: {
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-400",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  amber: {
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-400",
  },
  rose: {
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-400",
  },
};

const stats: Array<{
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
}> = [
  {
    label: "Tasks due today",
    value: "3",
    hint: "+1 from yesterday",
    icon: SquareKanban,
    tone: "sky",
  },
  {
    label: "Focus time",
    value: "2h 15m",
    hint: "+24m vs last week",
    icon: Timer,
    tone: "emerald",
  },
  {
    label: "Notes captured",
    value: "18",
    hint: "4 new this week",
    icon: NotebookPen,
    tone: "amber",
  },
  {
    label: "Active spaces",
    value: "6",
    hint: "2 shared with team",
    icon: Layers,
    tone: "indigo",
  },
];

const spaces: Array<{
  name: string;
  meta: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
}> = [
  {
    name: "Product Roadmap",
    meta: "12 pages · 4 boards",
    icon: Layers,
    tone: "indigo",
  },
  {
    name: "Q4 Launch",
    meta: "8 pages · 2 boards",
    icon: Rocket,
    tone: "rose",
  },
  {
    name: "Personal",
    meta: "23 notes",
    icon: Coffee,
    tone: "emerald",
  },
  {
    name: "Team Wiki",
    meta: "31 pages",
    icon: BookOpen,
    tone: "amber",
  },
];

const suggestions = ["Summarise my week", "Plan Q4 goals", "Draft a project brief"];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Greeting />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-xl bg-card/70 px-3.5"
          >
            <Plus className="size-4" />
            New page
          </Button>
          <Button className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-3.5 text-white shadow-sm hover:from-sky-600 hover:to-violet-600">
            <Sparkles className="size-4" />
            Ask Flow AI
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="cozy-card p-4">
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  tones[stat.tone].chip,
                )}
              >
                <stat.icon className="size-[18px]" />
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-3" />
                {stat.hint}
              </span>
            </div>
            <p className="mt-3 font-heading text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FocusList />
        </div>

        <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-sky-500 via-violet-500 to-fuchsia-500 p-5 text-white shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--primary)_90%,transparent)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
              <Sparkles className="size-[18px]" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold">Flow AI</h2>
              <p className="text-xs text-white/75">
                Copilot for pages, tasks and boards
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white/15 p-3 text-sm text-white/85 ring-1 ring-white/20">
            Ask anything about your workspace…
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/25"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="cozy-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">
              Your spaces
            </h2>
            <p className="text-xs text-muted-foreground">
              Jump back into the places you work in
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
            View all
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {spaces.map((space) => (
            <div
              key={space.name}
              className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-[0_10px_24px_-16px_color-mix(in_oklch,var(--foreground)_45%,transparent)]"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    tones[space.tone].chip,
                  )}
                >
                  <space.icon className="size-[18px]" />
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{space.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{space.meta}</p>
              </div>
            </div>
          ))}

          <div className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/30 p-4 text-center transition-colors hover:border-primary/50 hover:bg-accent/40">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Plus className="size-4" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">New space</p>
          </div>
        </div>
      </section>
    </div>
  );
}
