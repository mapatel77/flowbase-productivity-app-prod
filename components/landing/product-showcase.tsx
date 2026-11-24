import {
  LayoutDashboard,
  NotebookPen,
  Presentation,
  Sparkles,
  SquareKanban,
} from "lucide-react";

const showcases = [
  {
    icon: LayoutDashboard,
    title: "Dashboard overview",
    description: "Today's focus, open tasks, and recent spaces at a glance.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    mockup: (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/60" />
          ))}
        </div>
        <div className="h-24 rounded-lg bg-muted/40" />
      </div>
    ),
  },
  {
    icon: NotebookPen,
    title: "Notes editor",
    description: "A rich, Notion-style editor with slash commands and AI refine.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    mockup: (
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded-full bg-foreground/15" />
        <div className="h-2.5 w-full rounded-full bg-foreground/10" />
        <div className="h-2.5 w-5/6 rounded-full bg-foreground/10" />
        <div className="h-2.5 w-2/3 rounded-full bg-foreground/10" />
        <div className="mt-3 h-12 rounded-lg bg-amber-500/10" />
      </div>
    ),
  },
  {
    icon: SquareKanban,
    title: "Kanban board",
    description: "Drag-and-drop columns that keep work moving.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    mockup: (
      <div className="grid grid-cols-3 gap-2">
        {["To do", "Doing", "Done"].map((c) => (
          <div key={c} className="rounded-lg bg-muted/40 p-2">
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">{c}</div>
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-foreground/15" />
              <div className="h-2 rounded-full bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Presentation,
    title: "Whiteboard",
    description: "An infinite canvas for diagrams, sticky notes, and ideas.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    mockup: (
      <div className="relative h-28 rounded-lg bg-muted/40">
        <div className="absolute left-4 top-4 size-10 rounded-lg bg-emerald-500/20" />
        <div className="absolute left-20 top-8 h-6 w-24 rounded-full bg-sky-500/20" />
        <div className="absolute right-6 top-6 size-8 rounded-full bg-rose-500/20" />
        <div className="absolute bottom-4 left-10 h-2 w-32 rounded-full bg-foreground/15" />
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description: "Ask Flow AI to create tasks, refine notes, and generate diagrams.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    mockup: (
      <div className="space-y-2">
        <div className="ml-auto w-4/5 rounded-lg bg-violet-500/15 p-2 text-[11px] text-muted-foreground">
          Summarise today's notes
        </div>
        <div className="w-4/5 rounded-lg bg-muted/60 p-2 text-[11px] text-muted-foreground">
          Here's a 3-bullet summary…
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-full bg-muted/60" />
          <div className="h-6 w-20 rounded-full bg-muted/60" />
        </div>
      </div>
    ),
  },
];

export function ProductShowcase() {
  return (
    <section id="product" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Product
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            A workspace that feels like one tool
          </h2>
          <p className="mt-4 text-muted-foreground">
            Clean, focused surfaces for every kind of work — from quick notes to
            complex project boards.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {showcases.map((s) => (
            <div key={s.title} className="cozy-card p-5">
              <div className="flex items-center gap-3">
                <div className={`flex size-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`size-4 ${s.color}`} />
                </div>
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  {s.title}
                </h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-4">{s.mockup}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
