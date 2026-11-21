import { connection } from "next/server";

import { PricingView } from "@/components/settings/pricing-view";
import { getPlanSnapshot } from "@/lib/billing/plan";
import { isClerkConfigured } from "@/lib/calendar/user";
import { getSettingsProfile } from "@/lib/settings/queries";

export default async function PricingPage() {
  await connection();

  const data = await getSettingsProfile();
  const plan = data ? await getPlanSnapshot(data.profile) : null;

  const billingConfigured =
    process.env.CLERK_BILLING_ENABLED === "true" && isClerkConfigured;

  return (
    <PricingView
      billingConfigured={billingConfigured}
      isPro={plan?.isPro ?? false}
    />
  );
}
