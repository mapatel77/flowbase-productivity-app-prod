"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

import { db } from "@/db";
import { calendarCategories, userSettings, users } from "@/db/schema";
import { getPlanSnapshot } from "@/lib/billing/plan";
import { isColorToken, type ColorToken } from "@/lib/calendar/colors";
import {
  CATEGORY_SCOPES,
  type ActionResult,
  type CalendarCategory,
  type CategoryScope,
} from "@/lib/calendar/types";
import { resolveCurrentUserProfile, isClerkConfigured } from "@/lib/calendar/user";
import { KANBAN_PRIORITIES } from "@/lib/kanban/types";
import { REFINE_MODES, REFINE_TONES } from "@/lib/notes/types";

import {
  CATEGORY_ICON_NAMES,
  CATEGORY_NAME_MAX_LENGTH,
  AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH,
} from "@/lib/settings/constants";
import {
  getUserSettings,
  toCategory,
  toUserSettings,
} from "@/lib/settings/queries";
import {
  AI_MODEL_OPTIONS,
  CALENDAR_VIEW_OPTIONS,
  THEME_OPTIONS,
  type UserSettings,
  type UserSettingsPatch,
} from "@/lib/settings/types";

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Settings action failed", error);
  return { ok: false, error: message };
}

async function requireProfile() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) throw new Error("No workspace user could be found.");
  return profile;
}

function oneOf<T extends string>(
  options: readonly T[],
  value: string,
): value is T {
  return (options as readonly string[]).includes(value);
}

function revalidateSettingsSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/notes");
  revalidatePath("/tasks");
  revalidatePath("/", "layout");
}

/* ── profile ───────────────────────────────────────────────────────────── */

export async function updateProfileName(input: {
  name: string;
}): Promise<ActionResult<{ name: string }>> {
  try {
    const profile = await requireProfile();
    const name = input.name.trim().slice(0, 80);

    if (!name) return { ok: false, error: "Please enter your name." };

    await db.update(users).set({ name }).where(eq(users.id, profile.id));

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true, data: { name } };
  } catch (error) {
    return fail(error);
  }
}

/* ── preferences ───────────────────────────────────────────────────────── */

export async function updateUserSettings(
  input: UserSettingsPatch,
): Promise<ActionResult<UserSettings>> {
  try {
    const profile = await requireProfile();
    // Seeding here guarantees the UPDATE below always has a row to touch.
    await getUserSettings(profile.id);
    const patch: Partial<typeof userSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.aiModel !== undefined) {
      if (!oneOf(AI_MODEL_OPTIONS, input.aiModel)) {
        return { ok: false, error: "That AI model is not available." };
      }

      const plan = await getPlanSnapshot(profile);
      patch.aiModel =
        input.aiModel === "gemini-3.6-pro" && !plan.isPro
          ? "gemini-3.6-flash"
          : input.aiModel;
    }

    if (input.aiDefaultMode !== undefined) {
      if (!oneOf(REFINE_MODES, input.aiDefaultMode)) {
        return { ok: false, error: "That AI behavior is not available." };
      }
      patch.aiDefaultMode = input.aiDefaultMode;
    }

    if (input.aiTone !== undefined) {
      if (!oneOf(REFINE_TONES, input.aiTone)) {
        return { ok: false, error: "That AI tone is not available." };
      }
      patch.aiTone = input.aiTone;
    }

    if (input.aiCustomInstructions !== undefined) {
      patch.aiCustomInstructions = input.aiCustomInstructions
        .trim()
        .slice(0, AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH);
    }

    if (input.theme !== undefined) {
      if (!oneOf(THEME_OPTIONS, input.theme)) {
        return { ok: false, error: "That theme is not available." };
      }
      patch.theme = input.theme;
    }

    if (input.calendarDefaultView !== undefined) {
      if (!oneOf(CALENDAR_VIEW_OPTIONS, input.calendarDefaultView)) {
        return { ok: false, error: "That calendar view is not available." };
      }
      patch.calendarDefaultView = input.calendarDefaultView;
    }

    if (input.defaultTaskPriority !== undefined) {
      if (!oneOf(KANBAN_PRIORITIES, input.defaultTaskPriority)) {
        return { ok: false, error: "That task priority is not available." };
      }
      patch.defaultTaskPriority = input.defaultTaskPriority;
    }

    const booleanKeys = [
      "aiRefineEnabled",
      "aiAssistantEnabled",
      "aiTemplateBuilderEnabled",
      "aiDiagramEnabled",
      "autoSaveEnabled",
      "notifyTaskReminders",
      "notifyDueDates",
      "notifyWeeklyDigest",
      "notifyProductUpdates",
      "privacyProfileDiscoverable",
      "privacyShowActivity",
      "privacyAnalytics",
    ] as const;

    for (const key of booleanKeys) {
      if (input[key] !== undefined) {
        patch[key] = Boolean(input[key]);
      }
    }

    const [row] = await db
      .update(userSettings)
      .set(patch)
      .where(eq(userSettings.userId, profile.id))
      .returning();

    if (!row) return { ok: false, error: "Could not save your settings." };

    const next = toUserSettings(row);

    revalidateSettingsSurfaces();
    return { ok: true, data: next };
  } catch (error) {
    return fail(error);
  }
}

/* ── categories ────────────────────────────────────────────────────────── */

function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, CATEGORY_NAME_MAX_LENGTH);
}

export async function createSettingsCategory(input: {
  scope: CategoryScope;
  name: string;
  color: ColorToken;
  icon: string;
}): Promise<ActionResult<CalendarCategory>> {
  try {
    const profile = await requireProfile();

    if (!oneOf(CATEGORY_SCOPES, input.scope)) {
      return { ok: false, error: "That category type is not available." };
    }

    const name = normalizeCategoryName(input.name);
    if (!name) return { ok: false, error: "Give the category a name." };

    const color = isColorToken(input.color) ? input.color : "sky";
    const icon = oneOf(CATEGORY_ICON_NAMES, input.icon) ? input.icon : "Tag";

    const [row] = await db
      .insert(calendarCategories)
      .values({
        userId: profile.id,
        name,
        color,
        icon,
        scope: input.scope,
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      return {
        ok: false,
        error: `A ${input.scope} category called “${name}” already exists.`,
      };
    }

    revalidateSettingsSurfaces();
    return { ok: true, data: toCategory(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function updateSettingsCategory(input: {
  id: number;
  name: string;
  color: ColorToken;
  icon: string;
}): Promise<ActionResult<CalendarCategory>> {
  try {
    const profile = await requireProfile();
    const name = normalizeCategoryName(input.name);
    if (!name) return { ok: false, error: "Give the category a name." };

    const [row] = await db
      .update(calendarCategories)
      .set({
        name,
        color: isColorToken(input.color) ? input.color : "sky",
        icon: oneOf(CATEGORY_ICON_NAMES, input.icon) ? input.icon : "Tag",
      })
      .where(
        and(
          eq(calendarCategories.id, input.id),
          eq(calendarCategories.userId, profile.id),
        ),
      )
      .returning();

    if (!row) return { ok: false, error: "That category no longer exists." };

    revalidateSettingsSurfaces();
    return { ok: true, data: toCategory(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSettingsCategory(
  id: number,
): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await requireProfile();
    const [row] = await db
      .delete(calendarCategories)
      .where(
        and(
          eq(calendarCategories.id, id),
          eq(calendarCategories.userId, profile.id),
        ),
      )
      .returning({ id: calendarCategories.id });

    if (!row) return { ok: false, error: "That category no longer exists." };

    revalidateSettingsSurfaces();
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return fail(error);
  }
}

/* ── account ───────────────────────────────────────────────────────────── */

export async function deleteAccount(input: {
  confirmation: string;
}): Promise<ActionResult<{ deleted: true }>> {
  try {
    if (input.confirmation.trim().toUpperCase() !== "DELETE") {
      return { ok: false, error: "Type DELETE to confirm." };
    }

    const profile = await requireProfile();

    if (
      isClerkConfigured &&
      profile.clerkId &&
      !profile.clerkId.startsWith("local-demo")
    ) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(profile.clerkId);
      } catch (error) {
        console.error("Could not delete the Clerk user", error);
        return {
          ok: false,
          error:
            "Your account could not be deleted. Please try again or contact support.",
        };
      }
    }

    await db.delete(users).where(eq(users.id, profile.id));

    revalidatePath("/", "layout");
    return { ok: true, data: { deleted: true } };
  } catch (error) {
    return fail(error);
  }
}
