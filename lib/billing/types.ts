export const PLAN_LIMIT_KEYS = ["notes", "spaces", "boards", "calendar"] as const;

export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

export const PLAN_LIMIT_LABELS: Record<PlanLimitKey, string> = {
  notes: "Notes",
  spaces: "Spaces",
  boards: "Kanban boards",
  calendar: "Calendar entries",
};

export type PlanTier = "free" | "pro";

export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "ended"
  | "none";

export type PlanSnapshot = {
  tier: PlanTier;
  name: string;
  status: BillingStatus;
  isPro: boolean;
  /** ISO date string for the next renewal, when Clerk provides one. */
  renewalDate: string | null;
  /** Whether Clerk Billing is configured and limits are enforced. */
  enforced: boolean;
  /** Whether the app is running without Clerk keys (local demo mode). */
  demo: boolean;
  limits: Record<PlanLimitKey, number | null>;
  usage: Record<PlanLimitKey, number>;
};

export const FREE_PLAN_LIMITS: Record<PlanLimitKey, number> = {
  notes: 100,
  spaces: 10,
  boards: 3,
  calendar: 100,
};

export const PRO_PLAN_LIMITS: Record<PlanLimitKey, null> = {
  notes: null,
  spaces: null,
  boards: null,
  calendar: null,
};
