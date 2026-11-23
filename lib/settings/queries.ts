import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  calendarCategories,
  userSettings,
  type UserSettingsRow,
} from "@/db/schema";
import { isColorToken } from "@/lib/calendar/colors";
import {
  CATEGORY_SCOPES,
  type CalendarCategory,
  type CategoryScope,
} from "@/lib/calendar/types";
import { KANBAN_PRIORITIES } from "@/lib/kanban/types";
import { REFINE_MODES, REFINE_TONES } from "@/lib/notes/types";
import {
  resolveCurrentUserProfile,
  type CurrentUserProfile,
} from "@/lib/calendar/user";

import {
  CATEGORY_ICON_NAMES,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
} from "./constants";
import {
  AI_MODEL_OPTIONS,
  CALENDAR_VIEW_OPTIONS,
  THEME_OPTIONS,
  type UserSettings,
} from "./types";

function oneOf<T extends string>(
  options: readonly T[],
  value: string,
): value is T {
  return (options as readonly string[]).includes(value);
}

export function toCategory(
  row: typeof calendarCategories.$inferSelect,
): CalendarCategory {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : "sky",
    scope: oneOf(CATEGORY_SCOPES, row.scope) ? row.scope : "calendar",
    icon: oneOf(CATEGORY_ICON_NAMES, row.icon) ? row.icon : "Tag",
    createdAt: row.createdAt,
  };
}

export function toUserSettings(row: UserSettingsRow): UserSettings {
  return {
    id: row.id,
    userId: row.userId,
    aiModel: oneOf(AI_MODEL_OPTIONS, row.aiModel)
      ? row.aiModel
      : DEFAULT_SETTINGS.aiModel,
    aiDefaultMode: oneOf(REFINE_MODES, row.aiDefaultMode)
      ? row.aiDefaultMode
      : DEFAULT_SETTINGS.aiDefaultMode,
    aiTone: oneOf(REFINE_TONES, row.aiTone)
      ? row.aiTone
      : DEFAULT_SETTINGS.aiTone,
    aiCustomInstructions: row.aiCustomInstructions,
    aiRefineEnabled: row.aiRefineEnabled,
    aiAssistantEnabled: row.aiAssistantEnabled,
    aiAssistantLastUsedAt: row.aiAssistantLastUsedAt,
    aiTemplateBuilderEnabled: row.aiTemplateBuilderEnabled,
    aiDiagramEnabled: row.aiDiagramEnabled,
    theme: oneOf(THEME_OPTIONS, row.theme)
      ? row.theme
      : DEFAULT_SETTINGS.theme,
    calendarDefaultView: oneOf(CALENDAR_VIEW_OPTIONS, row.calendarDefaultView)
      ? row.calendarDefaultView
      : DEFAULT_SETTINGS.calendarDefaultView,
    defaultTaskPriority: oneOf(KANBAN_PRIORITIES, row.defaultTaskPriority)
      ? row.defaultTaskPriority
      : DEFAULT_SETTINGS.defaultTaskPriority,
    autoSaveEnabled: row.autoSaveEnabled,
    notifyTaskReminders: row.notifyTaskReminders,
    notifyDueDates: row.notifyDueDates,
    notifyWeeklyDigest: row.notifyWeeklyDigest,
    notifyProductUpdates: row.notifyProductUpdates,
    privacyProfileDiscoverable: row.privacyProfileDiscoverable,
    privacyShowActivity: row.privacyShowActivity,
    privacyAnalytics: row.privacyAnalytics,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createFallbackSettings(userId = 0): UserSettings {
  return {
    id: 0,
    userId,
    ...DEFAULT_SETTINGS,
    aiAssistantLastUsedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  await db
    .insert(userSettings)
    .values({
      userId,
      ...DEFAULT_SETTINGS,
      aiCustomInstructions: "",
    })
    .onConflictDoNothing({ target: userSettings.userId });

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return row ? toUserSettings(row) : createFallbackSettings(userId);
}

/**
 * Safe for the root layout: a missing database or signed-out visitor should
 * never prevent the app shell from rendering.
 */
export async function getCurrentUserSettings(): Promise<UserSettings> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return createFallbackSettings();
    return await getUserSettings(profile.id);
  } catch (error) {
    console.error("Could not load user settings", error);
    return createFallbackSettings();
  }
}

async function seedScope(userId: number, scope: CategoryScope) {
  const defaults = DEFAULT_CATEGORIES[scope];
  if (defaults.length === 0) return;

  await db
    .insert(calendarCategories)
    .values(
      defaults.map((category) => ({
        userId,
        name: category.name,
        color: category.color,
        scope,
        icon: category.icon,
      })),
    )
    .onConflictDoNothing();
}

/** Seeds the curated starter categories only when a scope is still empty. */
export async function ensureDefaultCategoriesForScope(
  userId: number,
  scope: CategoryScope,
): Promise<void> {
  const existing = await db
    .select({ id: calendarCategories.id })
    .from(calendarCategories)
    .where(
      and(
        eq(calendarCategories.userId, userId),
        eq(calendarCategories.scope, scope),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await seedScope(userId, scope);
  }
}

export async function getCategoriesForScope(
  userId: number,
  scope: CategoryScope,
  { seed = true }: { seed?: boolean } = {},
): Promise<CalendarCategory[]> {
  if (seed) await ensureDefaultCategoriesForScope(userId, scope);

  const rows = await db
    .select()
    .from(calendarCategories)
    .where(
      and(
        eq(calendarCategories.userId, userId),
        eq(calendarCategories.scope, scope),
      ),
    )
    .orderBy(asc(calendarCategories.name), asc(calendarCategories.id));

  return rows.map(toCategory);
}

export async function getCategoriesForUser(
  userId: number,
): Promise<CalendarCategory[]> {
  const rows = await db
    .select()
    .from(calendarCategories)
    .where(eq(calendarCategories.userId, userId))
    .orderBy(
      asc(calendarCategories.scope),
      asc(calendarCategories.name),
      asc(calendarCategories.id),
    );

  const scopesPresent = new Set(rows.map((row) => row.scope));
  const missing = CATEGORY_SCOPES.filter((scope) => !scopesPresent.has(scope));

  if (missing.length > 0) {
    await Promise.all(missing.map((scope) => seedScope(userId, scope)));
    return getCategoriesForUserWithoutSeeding(userId);
  }

  return rows.map(toCategory);
}

async function getCategoriesForUserWithoutSeeding(
  userId: number,
): Promise<CalendarCategory[]> {
  const rows = await db
    .select()
    .from(calendarCategories)
    .where(eq(calendarCategories.userId, userId))
    .orderBy(
      asc(calendarCategories.scope),
      asc(calendarCategories.name),
      asc(calendarCategories.id),
    );

  return rows.map(toCategory);
}

export async function getSettingsProfile(): Promise<{
  profile: CurrentUserProfile;
  settings: UserSettings;
} | null> {
  const profile = await resolveCurrentUserProfile();
  if (!profile) return null;

  return {
    profile,
    settings: await getUserSettings(profile.id),
  };
}
