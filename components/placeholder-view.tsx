import { Sparkles } from "lucide-react";

import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const buildingBlocks = [
  "Structured blocks with a calm, paper-like canvas",
  "Real-time collaboration with presence avatars",
  "AI assistance baked into every surface",
];

export function PlaceholderView({ item }: { item: NavItem }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 py-10 text-center md:py-16">
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-2xl bg-accent ring-1 ring-border",
          item.iconClassName,
        )}
      >
        <item.icon className="size-8" strokeWidth={1.9} />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {item.title}
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>

      <div className="cozy-card w-full p-6 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-amber-500" />
          Coming next
        </div>
        <ul className="mt-4 flex flex-col gap-2.5">
          {buildingBlocks.map((block) => (
            <li
              key={block}
              className="flex items-start gap-2.5 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
              {block}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
