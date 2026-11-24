import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the essentials.",
    features: ["Notes & pages", "Basic Kanban board", "Calendar", "1 workspace", "Community support"],
    cta: "Start for Free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For individuals who want AI superpowers.",
    features: [
      "Everything in Free",
      "AI Assistant (unlimited)",
      "AI Template Builder",
      "Whiteboard",
      "Unlimited pages",
      "Priority support",
    ],
    cta: "Get Pro",
    href: "/sign-up",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$39",
    period: "per month / 5 seats",
    description: "For teams collaborating in real time.",
    features: [
      "Everything in Pro",
      "Live collaboration",
      "Shared workspaces",
      "Admin controls",
      "SSO (soon)",
      "Dedicated support",
    ],
    cta: "Start Team Trial",
    href: "/sign-up",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free, upgrade when you need more power.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative cozy-card p-6 ${
                plan.highlighted ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <div className="font-heading text-lg font-semibold tracking-tight">
                {plan.name}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-xs text-muted-foreground">/ {plan.period}</span>
              </div>
              <Button
                className="mt-6 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                render={<Link href={plan.href} />}
              >
                {plan.cta}
              </Button>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
