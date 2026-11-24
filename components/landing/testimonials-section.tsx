import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Flowbase replaced four tools for our team. The AI assistant actually saves us hours every week.",
    name: "Sarah Chen",
    role: "Founder, Meridian Labs",
  },
  {
    quote:
      "The whiteboard plus notes combo is perfect for planning sprints. Real-time collab just works.",
    name: "Marcus Rivera",
    role: "Product Manager, Northwind",
  },
  {
    quote:
      "I use Flowbase for everything — study notes, tasks, and my personal goals. It's beautifully calm.",
    name: "Aisha Patel",
    role: "Graduate Student",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Testimonials
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Loved by builders and teams
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="cozy-card p-6">
              <Quote className="size-6 text-primary/40" />
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                “{t.quote}”
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-sm font-semibold text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-heading text-sm font-semibold tracking-tight">
                    {t.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
