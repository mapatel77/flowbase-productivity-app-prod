import type { ColorToken } from "@/lib/calendar/colors";
import type { CategoryScope } from "@/lib/calendar/types";
import type { KanbanPriority } from "@/lib/kanban/types";
import type { RefineMode, RefineTone } from "@/lib/notes/types";

import type {
  AiModelPreference,
  CalendarViewPreference,
  ThemePreference,
  UserSettingsPatch,
} from "./types";

export const DEFAULT_SETTINGS: Required<
  Pick<
    UserSettingsPatch,
    | "aiModel"
    | "aiDefaultMode"
    | "aiTone"
    | "aiCustomInstructions"
    | "aiRefineEnabled"
    | "aiAssistantEnabled"
    | "aiTemplateBuilderEnabled"
    | "aiDiagramEnabled"
    | "theme"
    | "calendarDefaultView"
    | "defaultTaskPriority"
    | "autoSaveEnabled"
    | "notifyTaskReminders"
    | "notifyDueDates"
    | "notifyWeeklyDigest"
    | "notifyProductUpdates"
    | "privacyProfileDiscoverable"
    | "privacyShowActivity"
    | "privacyAnalytics"
  >
> = {
  aiModel: "server-default" satisfies AiModelPreference,
  aiDefaultMode: "grammar" satisfies RefineMode,
  aiTone: "professional" satisfies RefineTone,
  aiCustomInstructions: "",
  aiRefineEnabled: true,
  aiAssistantEnabled: true,
  aiTemplateBuilderEnabled: true,
  aiDiagramEnabled: true,
  theme: "system" satisfies ThemePreference,
  calendarDefaultView: "month" satisfies CalendarViewPreference,
  defaultTaskPriority: "medium" satisfies KanbanPriority,
  autoSaveEnabled: true,
  notifyTaskReminders: true,
  notifyDueDates: true,
  notifyWeeklyDigest: false,
  notifyProductUpdates: false,
  privacyProfileDiscoverable: true,
  privacyShowActivity: true,
  privacyAnalytics: false,
};

export const CATEGORY_NAME_MAX_LENGTH = 40;
export const AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH = 600;

export type DefaultCategory = {
  name: string;
  color: ColorToken;
  icon: string;
};

export const DEFAULT_CATEGORIES: Record<CategoryScope, DefaultCategory[]> = {
  calendar: [
    { name: "Work", color: "sky", icon: "Briefcase" },
    { name: "Personal", color: "violet", icon: "UserRound" },
    { name: "Health", color: "emerald", icon: "HeartPulse" },
    { name: "Learning", color: "amber", icon: "GraduationCap" },
  ],
  task: [
    { name: "Design", color: "violet", icon: "Palette" },
    { name: "Bug", color: "rose", icon: "Bug" },
    { name: "Research", color: "sky", icon: "Microscope" },
    { name: "Urgent", color: "amber", icon: "Flame" },
  ],
  note: [
    { name: "Ideas", color: "amber", icon: "Lightbulb" },
    { name: "Meeting notes", color: "sky", icon: "UsersRound" },
    { name: "Journal", color: "violet", icon: "BookOpen" },
    { name: "Reference", color: "emerald", icon: "Library" },
  ],
  reminder: [
    { name: "Bills", color: "rose", icon: "Receipt" },
    { name: "Birthdays", color: "amber", icon: "Gift" },
    { name: "Habits", color: "emerald", icon: "Repeat2" },
    { name: "Follow-ups", color: "sky", icon: "BellRing" },
  ],
};

export const CATEGORY_ICON_OPTIONS = [
  { name: "Tag", label: "Tag" },
  { name: "Star", label: "Star" },
  { name: "CalendarDays", label: "Calendar" },
  { name: "Target", label: "Target" },
  { name: "Sparkles", label: "Sparkles" },
  { name: "Home", label: "Home" },
  { name: "Plane", label: "Travel" },
  { name: "Coffee", label: "Coffee" },
  { name: "Dumbbell", label: "Fitness" },
  { name: "Banknote", label: "Money" },
  { name: "Music", label: "Music" },
  { name: "Camera", label: "Camera" },
  { name: "Rocket", label: "Launch" },
  { name: "Folder", label: "Folder" },
  { name: "Bookmark", label: "Bookmark" },
  { name: "Gauge", label: "Focus" },
  { name: "Bell", label: "Bell" },
  { name: "Briefcase", label: "Work" },
  { name: "UserRound", label: "Person" },
  { name: "HeartPulse", label: "Health" },
  { name: "GraduationCap", label: "Learning" },
  { name: "Palette", label: "Design" },
  { name: "Bug", label: "Bug" },
  { name: "Microscope", label: "Research" },
  { name: "Flame", label: "Urgent" },
  { name: "Lightbulb", label: "Idea" },
  { name: "UsersRound", label: "Team" },
  { name: "BookOpen", label: "Reading" },
  { name: "Library", label: "Library" },
  { name: "Receipt", label: "Receipt" },
  { name: "Gift", label: "Gift" },
  { name: "Repeat2", label: "Habit" },
  { name: "BellRing", label: "Reminder" },
  { name: "CheckSquare", label: "Task" },
  { name: "Clock", label: "Time" },
  { name: "Flag", label: "Flag" },
] as const;

export const CATEGORY_ICON_NAMES = CATEGORY_ICON_OPTIONS.map(
  (option) => option.name,
);

export function isCategoryIconName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (CATEGORY_ICON_NAMES as readonly string[]).includes(value)
  );
}
