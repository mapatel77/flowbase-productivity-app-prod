import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FinalCTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 p-10 text-center text-white shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--primary)_60%,transparent)] md:p-16">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="size-6" />
            </div>
            <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Build your entire productivity system in one AI workspace
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Notes, tasks, whiteboards, calendar, and an AI assistant — all in
              one calm, colourful place. Free to start.
            </p>
            <Button
              size="lg"
              className="mt-8 bg-white text-primary hover:bg-white/90"
              render={<Link href="/sign-up" />}
            >
              Start for Free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
