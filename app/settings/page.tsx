import { Settings } from "lucide-react";
import { connection } from "next/server";

import { SettingsView } from "@/components/settings/settings-view";
import { getPlanSnapshot } from "@/lib/billing/plan";
import { isClerkConfigured } from "@/lib/calendar/user";
import {
  getCategoriesForUser,
  getSettingsProfile,
} from "@/lib/settings/queries";

export default async function SettingsPage() {
  await connection();

  const data = await getSettingsProfile();

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Settings className="size-5" />
        </span>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Settings are unavailable
        </h1>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          We could not resolve a workspace for you. Check your database
          connection and refresh the page.
        </p>
      </div>
    );
  }

  const [plan, categories] = await Promise.all([
    getPlanSnapshot(data.profile),
    getCategoriesForUser(data.profile.id),
  ]);

  const billingEnabled =
    process.env.CLERK_BILLING_ENABLED === "true" && isClerkConfigured;

  return (
    <SettingsView
      profile={data.profile}
      initialCategories={categories}
      plan={plan}
      clerkConfigured={isClerkConfigured}
      billingEnabled={billingEnabled}
    />
  );
}
