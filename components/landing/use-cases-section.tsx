import {
  Briefcase,
  GraduationCap,
  Heart,
  Rocket,
  Users,
  Video,
} from "lucide-react";

const useCases = [
  { icon: Rocket, title: "Founders", description: "Run your company from one workspace — roadmap, notes, and investor updates." },
  { icon: GraduationCap, title: "Students", description: "Organise classes, notes, and study plans with AI help." },
  { icon: Users, title: "Teams", description: "Shared boards and docs that keep everyone aligned." },
  { icon: Video, title: "Creators", description: "Plan content calendars, scripts, and launches." },
  { icon: Briefcase, title: "Project managers", description: "Track milestones, tasks, and team capacity." },
  { icon: Heart, title: "Personal productivity", description: "A calm system for goals, habits, and daily focus." },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Use cases
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Made for how you actually work
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you're a solo creator or a growing team, Flowbase adapts to
            your workflow.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((u) => (
            <div key={u.title} className="cozy-card p-5 transition-all hover:-translate-y-0.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <u.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
                {u.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{u.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
