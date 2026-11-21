import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, count, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  calendarEntries,
  kanbanBoards,
  notes,
  spaces,
} from "@/db/schema";
import {
  isClerkConfigured,
  resolveCurrentUserProfile,
  type CurrentUserProfile,
} from "@/lib/calendar/user";

import {
  FREE_PLAN_LIMITS,
  PLAN_LIMIT_LABELS,
  PRO_PLAN_LIMITS,
  type BillingStatus,
  type PlanLimitKey,
  type PlanSnapshot,
  type PlanTier,
} from "./types";

const PRO_PLAN_SLUG =
  process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_SLUG?.trim() || "pro";

const BILLING_ENABLED =
  process.env.CLERK_BILLING_ENABLED === "true" && isClerkConfigured;

function mapStatus(value: string | null | undefined): BillingStatus {
  switch (value) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "ended":
      return value;
    default:
      return "none";
  }
}

/** Counts the resources shown in Settings → Subscription. */
export async function getPlanUsage(
  userId: number,
): Promise<PlanSnapshot["usage"]> {
  const [noteRows, spaceRows, boardRows, calendarRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(notes)
      .where(and(eq(notes.userId, userId), isNull(notes.deletedAt))),
    db
      .select({ value: count() })
      .from(spaces)
      .where(and(eq(spaces.userId, userId), eq(spaces.archived, false))),
    db
      .select({ value: count() })
      .from(kanbanBoards)
      .where(eq(kanbanBoards.userId, userId)),
    db
      .select({ value: count() })
      .from(calendarEntries)
      .where(eq(calendarEntries.userId, userId)),
  ]);

  return {
    notes: Number(noteRows[0]?.value ?? 0),
    spaces: Number(spaceRows[0]?.value ?? 0),
    boards: Number(boardRows[0]?.value ?? 0),
    calendar: Number(calendarRows[0]?.value ?? 0),
  };
}

async function hasProSession(): Promise<boolean> {
  if (!BILLING_ENABLED) return false;

  try {
    const { has } = await auth();
    return has({ plan: PRO_PLAN_SLUG });
  } catch (error) {
    console.error("Could not read Clerk billing session", error);
    return false;
  }
}

/**
 * Resolves the authoritative plan from Clerk Billing. If the subscription
 * lookup fails we fall back to the session `has({ plan })` check so a temporary
 * Clerk API hiccup does not incorrectly lock a paying customer out of Pro.
 */
export async function getPlanSnapshot(
  profile: CurrentUserProfile,
): Promise<PlanSnapshot> {
  const usage = await getPlanUsage(profile.id);

  if (!BILLING_ENABLED || profile.clerkId === "local-demo") {
    return {
      tier: "free",
      name: "Free",
      status: "active",
      isPro: false,
      renewalDate: null,
      enforced: false,
      demo: !isClerkConfigured || profile.clerkId === "local-demo",
      limits: FREE_PLAN_LIMITS,
      usage,
    };
  }

  // Initialize all variables with safe defaults
  let tier: PlanTier = "free";
  let name = "Free";
  let status: BillingStatus = "active";
  let renewalDate: string | null = null;

  try {
    const client = await clerkClient();
    const subscription = await client.billing.getUserBillingSubscription(
      profile.clerkId,
    );

    const paidItem = subscription.subscriptionItems.find((item) => {
      const itemPlan = item.plan;
      return (
        itemPlan !== null &&
        !itemPlan.isDefault &&
        (item.status === "active" || item.status === "past_due")
      );
    });

    if (paidItem) {
      tier = "pro";
      name = paidItem.plan?.name || "Pro";
      status = paidItem.canceledAt
        ? "canceled"
        : mapStatus(subscription.status);
      const renewalTimestamp =
        paidItem.periodEnd ?? subscription.nextPayment?.date ?? null;
      renewalDate = renewalTimestamp
        ? new Date(renewalTimestamp).toISOString()
        : null;
    } else {
      const freeItem = subscription.subscriptionItems.find(
        (item) => item.plan?.isDefault,
      );
      name = freeItem?.plan?.name || "Free";
      status = mapStatus(subscription.status);
      if (status === "none") status = "active";
    }
  } catch (error) {
    console.error("Could not read the Clerk billing subscription", error);
    // Fallback: check if the user has a Pro session via auth
    const isPro = await hasProSession();
    if (isPro) {
      tier = "pro";
      name = "Pro";
      status = "active";
    } else {
      // No Pro session, assume Free plan
      tier = "free";
      name = "Free";
      status = "active";
      renewalDate = null; // explicitly set
    }
  }

  const isPro = tier === "pro";

  return {
    tier,
    name: isPro ? name : name === "Free" ? "Free" : name,
    status,
    isPro,
    renewalDate,
    enforced: true,
    demo: false,
    limits: isPro ? PRO_PLAN_LIMITS : FREE_PLAN_LIMITS,
    usage,
  };
}

export type LimitCheck =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Returns a friendly upgrade error when a Free account has hit a cap.
 * `CLERK_BILLING_ENABLED` deliberately turns this into a no-op so local demos
 * and unconfigured deployments keep working.
 */
export async function assertCanCreateResource(
  resource: PlanLimitKey,
): Promise<LimitCheck> {
  if (!BILLING_ENABLED) return { ok: true };

  const profile = await resolveCurrentUserProfile();
  if (!profile) return { ok: false, error: "No workspace user was found." };

  if (profile.clerkId === "local-demo") return { ok: true };

  const plan = await getPlanSnapshot(profile);
  if (!plan.enforced) return { ok: true };

  const limit = plan.limits[resource];
  if (limit === null) return { ok: true };

  if (plan.usage[resource] >= limit) {
    const label = PLAN_LIMIT_LABELS[resource].toLowerCase();
    return {
      ok: false,
      error: `Your Free plan includes ${limit} ${label}. Upgrade to Pro for unlimited ${label}.`,
    };
  }

  return { ok: true };
}
