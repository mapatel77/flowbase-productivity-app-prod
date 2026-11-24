"use client";

import {
  BellRing,
  CreditCard,
  Palette,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AiSection } from "@/components/settings/ai-section";
import { CategoriesSection } from "@/components/settings/categories-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { SettingsAvatar } from "@/components/settings/settings-avatar";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toast";
import type { PlanSnapshot } from "@/lib/billing/types";
import type { CurrentUserProfile } from "@/lib/calendar/user";
import type { CalendarCategory } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type SectionId =
  | "profile"
  | "subscription"
  | "categories"
  | "ai"
  | "preferences"
  | "notifications"
  | "privacy";

type SectionItem = {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
};

const sections: SectionItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Name, email and account access",
    icon: UserRound,
    iconClassName: "text-rose-500 dark:text-rose-400",
  },
  {
    id: "subscription",
    label: "Subscription",
    description: "Plan, usage and billing",
    icon: CreditCard,
    iconClassName: "text-sky-500 dark:text-sky-400",
  },
  {
    id: "categories",
    label: "Categories",
    description: "Colours and labels for your work",
    icon: Tags,
    iconClassName: "text-violet-500 dark:text-violet-400",
  },
  {
    id: "ai",
    label: "AI settings",
    description: "Models, voice and AI features",
    icon: Sparkles,
    iconClassName: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Theme and workspace defaults",
    icon: Palette,
    iconClassName: "text-orange-500 dark:text-orange-400",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Reminders and product updates",
    icon: BellRing,
    iconClassName: "text-amber-500 dark:text-amber-400",
  },
  {
    id: "privacy",
    label: "Privacy & data",
    description: "Visibility, export and account deletion",
    icon: ShieldCheck,
    iconClassName: "text-emerald-500 dark:text-emerald-400",
  },
];

export function SettingsView({
  profile,
  initialCategories,
  plan,
  clerkConfigured,
  billingEnabled,
}: {
  profile: CurrentUserProfile;
  initialCategories: CalendarCategory[];
  plan: PlanSnapshot;
  clerkConfigured: boolean;
  billingEnabled: boolean;
}) {
  const [section, setSection] = useState<SectionId>("profile");
  const [displayName, setDisplayName] = useState(profile.name);

  return (
    <Toaster>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="cozy-card relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-gradient-to-br from-orange-300/40 via-rose-300/25 to-violet-300/15 blur-3xl dark:from-orange-500/10 dark:via-rose-500/10 dark:to-violet-500/10" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <SettingsAvatar
              name={displayName}
              email={profile.email}
              clerkConfigured={clerkConfigured}
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                  Settings
                </h1>
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-0",
                    plan.isPro
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
                  )}
                >
                  {plan.name} plan
                </Badge>
              </div>
              <p className="mt-1 truncate text-[15px] font-medium text-foreground">
                {displayName?.trim() || "Flowbase member"}
              </p>
              <p className="truncate text-[12.5px] text-muted-foreground">
                {profile.email}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
              <Button
                variant="outline"
                className="h-9 rounded-xl bg-card/70"
                render={<Link href="/dashboard" />}
              >
                Back to workspace
              </Button>
              {!plan.isPro ? (
                <Button
                  className="h-9 rounded-xl"
                  render={<Link href="/pricing" />}
                >
                  Upgrade
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
          <nav
            aria-label="Settings sections"
            className="cozy-card h-fit overflow-hidden p-2 lg:sticky lg:top-20"
          >
            <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {sections.map((item) => {
                const active = section === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none lg:w-full lg:gap-2.5 lg:px-3 lg:py-2.5",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-card shadow-sm" : "bg-muted/55",
                      )}
                    >
                      <Icon className={cn("size-3.5", item.iconClassName)} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium">
                        {item.label}
                      </span>
                      <span className="hidden text-[10.5px] leading-tight text-muted-foreground lg:block">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="min-w-0">
            {section === "profile" ? (
              <ProfileSection
                profile={profile}
                clerkConfigured={clerkConfigured}
                onNameSaved={setDisplayName}
              />
            ) : null}

            {section === "subscription" ? (
              <SubscriptionSection plan={plan} billingEnabled={billingEnabled} />
            ) : null}

            {section === "categories" ? (
              <CategoriesSection initialCategories={initialCategories} />
            ) : null}

            {section === "ai" ? <AiSection plan={plan} /> : null}

            {section === "preferences" ? <PreferencesSection /> : null}

            {section === "notifications" ? <NotificationsSection /> : null}

            {section === "privacy" ? (
              <PrivacySection clerkConfigured={clerkConfigured} />
            ) : null}
          </main>
        </div>
      </div>
    </Toaster>
  );
}
