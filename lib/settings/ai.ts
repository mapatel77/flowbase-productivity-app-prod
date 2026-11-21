import { getPlanSnapshot } from "@/lib/billing/plan";
import type { PlanSnapshot } from "@/lib/billing/types";
import type { CurrentUserProfile } from "@/lib/calendar/user";

import { AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH } from "./constants";
import { getUserSettings } from "./queries";
import type { AiModelPreference, UserSettings } from "./types";

export type AiRuntimePreferences = {
  settings: UserSettings;
  plan: PlanSnapshot;
  /** `undefined` lets the AI module use its server default. */
  model: string | undefined;
  customInstructions: string;
  /** True when the stored Pro model was downgraded because of the plan. */
  modelDowngraded: boolean;
};

export function effectiveModelForPlan(
  model: AiModelPreference,
  isPro: boolean,
): string | undefined {
  if (model === "gemini-3.6-pro" && !isPro) return "gemini-3.6-flash";
  if (model === "server-default") return undefined;
  return model;
}

export async function getAiRuntimePreferences(
  profile: CurrentUserProfile,
): Promise<AiRuntimePreferences> {
  const [settings, plan] = await Promise.all([
    getUserSettings(profile.id),
    getPlanSnapshot(profile),
  ]);

  return {
    settings,
    plan,
    model: effectiveModelForPlan(settings.aiModel, plan.isPro),
    customInstructions: settings.aiCustomInstructions
      .trim()
      .slice(0, AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH),
    modelDowngraded:
      settings.aiModel === "gemini-3.6-pro" && !plan.isPro,
  };
}
