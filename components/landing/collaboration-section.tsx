import { MessageSquare, Radio, Share2, Users } from "lucide-react";

const items = [
  { icon: Share2, title: "Shared Kanban boards", description: "Everyone sees the same board, updated instantly." },
  { icon: Radio, title: "Active user presence", description: "See who's online and where they're working." },
  { icon: MessageSquare, title: "Task comments", description: "Discuss work right on the card, in context." },
  { icon: Users, title: "Team workspace experience", description: "Spaces, members, and permissions that scale." },
];

export function CollaborationSection() {
  return (
    <section id="collaboration" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Collaboration
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Built for teams, in real time
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powered by Liveblocks, Flowbase keeps everyone in sync — boards,
              notes, and whiteboards update live as your team works.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <div key={item.title} className="cozy-card p-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10">
                    <item.icon className="size-4 text-sky-500" />
                  </div>
                  <div className="mt-3 font-heading text-sm font-semibold tracking-tight">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cozy-card relative overflow-hidden p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-heading text-sm font-semibold">Live board</span>
              <div className="flex -space-x-2">
                {["bg-orange-400", "bg-sky-400", "bg-emerald-400", "bg-violet-400"].map(
                  (c, i) => (
                    <div
                      key={i}
                      className={`size-7 rounded-full ring-2 ring-card ${c} flex items-center justify-center text-[10px] font-semibold text-white`}
                    >
                      {["A", "M", "S", "R"][i]}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["To do", "In progress", "Done"].map((col, i) => (
                <div key={col} className="rounded-xl bg-muted/40 p-3">
                  <div className="mb-2 text-[11px] font-medium text-muted-foreground">{col}</div>
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div key={j} className="rounded-lg bg-card p-2 ring-1 ring-foreground/10">
                        <div className="h-2 w-3/4 rounded-full bg-foreground/15" />
                        <div className="mt-1.5 flex items-center gap-1">
                          <div className="size-3 rounded-full bg-sky-400" />
                          <div className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-300">
                Maya is editing “Launch plan” · 2 others viewing
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
