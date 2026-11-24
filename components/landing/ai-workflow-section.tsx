import {
  BarChart3,
  CalendarPlus,
  FileText,
  GitBranch,
  LayoutTemplate,
  ListChecks,
  Sparkles,
} from "lucide-react";

const aiFeatures = [
  { icon: ListChecks, title: "Ask AI to create tasks", description: "Turn a sentence into a structured task list on your Kanban board." },
  { icon: CalendarPlus, title: "Add calendar reminders", description: "Let AI schedule events and reminders from natural language." },
  { icon: FileText, title: "Refine note content", description: "Summarise, expand, or rewrite notes with one click." },
  { icon: GitBranch, title: "Generate diagrams", description: "Describe a flow and get a diagram on the whiteboard." },
  { icon: LayoutTemplate, title: "Build mini apps/templates", description: "Generate reusable page and whiteboard templates with AI." },
  { icon: BarChart3, title: "Get productivity insights", description: "Weekly summaries of what you shipped and where time went." },
];

export function AIWorkflowSection() {
  return (
    <section id="ai" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              AI features
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Let AI do the busywork
            </h2>
            <p className="mt-4 text-muted-foreground">
              Flow AI lives inside every surface — notes, tasks, calendar, and
              whiteboards — so you can plan and create faster without leaving
              your workspace.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {aiFeatures.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                    <f.icon className="size-4 text-violet-500" />
                  </div>
                  <div>
                    <div className="font-heading text-sm font-semibold tracking-tight">
                      {f.title}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {f.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cozy-card overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-foreground/10 bg-muted/40 px-4 py-3">
              <div className="flex size-6 items-center justify-center rounded-md bg-violet-500/15">
                <Sparkles className="size-3.5 text-violet-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Flow AI · conversation
              </span>
            </div>
            <div className="space-y-3 p-5">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-500/15 px-4 py-2.5 text-sm">
                Create a sprint plan for next week with 5 tasks.
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">
                Done — I added 5 tasks to your Kanban board and blocked 2 hours
                on Thursday for deep work.
              </div>
              <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-violet-500/15 px-4 py-2.5 text-sm">
                Summarise my meeting notes.
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">
                Here are 3 key takeaways from your notes…
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2">
                <span className="text-xs text-muted-foreground">Ask Flow AI…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


