import type { KanbanPriority } from "@/lib/kanban/types";
import type { RefineMode, RefineTone } from "@/lib/notes/types";

export const AI_MODEL_OPTIONS = [
  "server-default",
  "gemini-3.6-flash",
  "gemini-3.6-pro",
] as const;

export type AiModelPreference = (typeof AI_MODEL_OPTIONS)[number];

export const AI_MODEL_LABELS: Record<AiModelPreference, string> = {
  "server-default": "Use server default",
  "gemini-3.6-flash": "Gemini 3.6 Flash",
  "gemini-3.6-pro": "Gemini 3.6 Pro",
};

export const THEME_OPTIONS = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export const CALENDAR_VIEW_OPTIONS = ["month", "week"] as const;

export type CalendarViewPreference = (typeof CALENDAR_VIEW_OPTIONS)[number];

export const CALENDAR_VIEW_LABELS: Record<CalendarViewPreference, string> = {
  month: "Month",
  week: "Week",
};

export type UserSettings = {
  id: number;
  userId: number;
  aiModel: AiModelPreference;
  aiDefaultMode: RefineMode;
  aiTone: RefineTone;
  aiCustomInstructions: string;
  aiRefineEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiTemplateBuilderEnabled: boolean;
  aiDiagramEnabled: boolean;
  theme: ThemePreference;
  calendarDefaultView: CalendarViewPreference;
  defaultTaskPriority: KanbanPriority;
  autoSaveEnabled: boolean;
  notifyTaskReminders: boolean;
  notifyDueDates: boolean;
  notifyWeeklyDigest: boolean;
  notifyProductUpdates: boolean;
  privacyProfileDiscoverable: boolean;
  privacyShowActivity: boolean;
  privacyAnalytics: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserSettingsPatch = Partial<
  Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">
>;
