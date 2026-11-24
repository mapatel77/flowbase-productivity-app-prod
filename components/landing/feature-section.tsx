import {
  CalendarDays,
  LayoutDashboard,
  NotebookPen,
  Presentation,
  Settings,
  Sparkles,
  SquareKanban,
  Users,
  WandSparkles,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Assistant",
    description: "Chat with Flow AI to draft pages, summarise notes, and plan your week.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    gradient: "from-violet-500/5 to-transparent",
  },
  {
    icon: LayoutDashboard,
    title: "Smart Dashboard",
    description: "A calm home for today's focus, tasks, and recent spaces.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    gradient: "from-orange-500/5 to-transparent",
  },
  {
    icon: CalendarDays,
    title: "Calendar & Reminders",
    description: "Schedule deep work and see every deadline in one place.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    gradient: "from-rose-500/5 to-transparent",
  },
  {
    icon: SquareKanban,
    title: "Kanban / Task Boards",
    description: "Move work across boards with a calm, colourful kanban flow.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    gradient: "from-sky-500/5 to-transparent",
  },
  {
    icon: NotebookPen,
    title: "Notion-style Notes",
    description: "Capture quick thoughts and turn them into structured pages.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    gradient: "from-amber-500/5 to-transparent",
  },
  {
    icon: Presentation,
    title: "Niro-style Whiteboard",
    description: "Think out loud on an infinite canvas with your team.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    gradient: "from-emerald-500/5 to-transparent",
  },
  {
    icon: WandSparkles,
    title: "AI Template Builder",
    description: "Generate reusable page and whiteboard templates with AI.",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    gradient: "from-fuchsia-500/5 to-transparent",
  },
  {
    icon: Users,
    title: "Live Collaboration",
    description: "Shared boards, active presence, and task comments in real time.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    gradient: "from-indigo-500/5 to-transparent",
  },
  {
    icon: Settings,
    title: "Settings & Custom Categories",
    description: "Manage your profile, workspace, theme, and integrations.",
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    gradient: "from-slate-500/5 to-transparent",
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you need in one cosy workspace
          </h2>
          <p className="mt-4 text-muted-foreground">
            A unified platform that replaces a dozen tabs — notes, tasks,
            whiteboards, calendar, and AI — working together.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group cozy-card relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 bg-gradient-to-br ${feature.gradient}`}
            >
              <div className={`flex size-11 items-center justify-center rounded-xl ${feature.bg}`}>
                <feature.icon className={`size-5 ${feature.color}`} />
              </div>
              <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
