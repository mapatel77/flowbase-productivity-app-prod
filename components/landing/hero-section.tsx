import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  KanbanSquare,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GetStartedButton } from "./get-started-button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="cozy-glow absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1">
              <Sparkles className="size-3.5 text-violet-500" />
              New · AI workspace for modern teams
            </Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
              Your AI-Powered Workspace for{" "}
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-violet-500 bg-clip-text text-transparent">
                Notes, Tasks, Whiteboards,
              </span>{" "}
              and Team Collaboration
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Flowbase brings Notion-style notes, Miro-style whiteboards, Kanban
              boards, calendars, and an AI assistant into one calm, colourful
              workspace — so your team can plan, create, and ship together.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <GetStartedButton size="lg" />
              <Button
                variant="outline"
                size="lg"
                className="bg-card/70"
                render={<a href="#product" />}
              >
                Watch Demo
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              {[
                { icon: Sparkles, label: "AI Assistant", color: "text-violet-500" },
                { icon: Users, label: "Real-time Collaboration", color: "text-sky-500" },
                { icon: Zap, label: "Smart Workspace", color: "text-amber-500" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 px-3 py-1.5 text-xs font-medium backdrop-blur"
                >
                  <badge.icon className={`size-3.5 ${badge.color}`} />
                  {badge.label}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview mockup */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-orange-200/40 via-rose-200/30 to-violet-200/40 blur-2xl" />
            <div className="cozy-card overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-foreground/10 bg-muted/40 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="ml-2 h-2 w-32 rounded-full bg-foreground/10" />
              </div>
              <div className="grid gap-4 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: CalendarDays, label: "Today", value: "4 events", color: "text-rose-500", bg: "bg-rose-500/10" },
                    { icon: KanbanSquare, label: "Tasks", value: "12 open", color: "text-sky-500", bg: "bg-sky-500/10" },
                    { icon: CheckCircle2, label: "Done", value: "8 this week", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-muted/50 p-3">
                      <div className={`flex size-8 items-center justify-center rounded-lg ${stat.bg}`}>
                        <stat.icon className={`size-4 ${stat.color}`} />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{stat.label}</div>
                      <div className="font-heading text-sm font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-heading text-sm font-semibold">Kanban board</span>
                    <span className="text-xs text-muted-foreground">3 columns</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["To do", "In progress", "Done"].map((col, i) => (
                      <div key={col} className="rounded-lg bg-card p-2 ring-1 ring-foreground/10">
                        <div className="mb-2 text-[11px] font-medium text-muted-foreground">{col}</div>
                        <div className="space-y-1.5">
                          {Array.from({ length: 3 - i }).map((_, j) => (
                            <div key={j} className="h-2 rounded-full bg-foreground/10" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-sky-500/10 p-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15">
                    <Sparkles className="size-4 text-violet-500" />
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">AI Assistant</div>
                    <div className="text-muted-foreground">"Summarise today's standup notes"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
