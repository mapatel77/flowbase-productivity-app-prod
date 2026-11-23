import type { ColorToken } from "@/lib/calendar/colors";

export type DashboardFeatureKey =
  | "calendar"
  | "tasks"
  | "notes"
  | "whiteboard"
  | "ai-assistant"
  | "template-builder";

export type DashboardFeatureStatus =
  | "active"
  | "ready"
  | "disabled"
  | "error";

export type DashboardFeatureStat = {
  label: string;
  value: string;
};

export type DashboardFeature = {
  key: DashboardFeatureKey;
  name: string;
  href: string;
  status: DashboardFeatureStatus;
  statusLabel: string;
  stats: DashboardFeatureStat[];
};

export type DashboardUpcomingKind = "task" | "reminder";

export type DashboardUpcomingItem = {
  id: number;
  title: string;
  /** `yyyy-MM-dd` */
  date: string;
  /** `HH:mm`, when the entry has a time. */
  time: string | null;
  kind: DashboardUpcomingKind;
  categoryId: number | null;
  categoryName: string | null;
  color: ColorToken | null;
};

export type DashboardTaskSummary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  /** Integer percentage from 0 to 100. */
  progress: number;
  dueToday: number;
  weeklyTotal: number;
  weeklyCompleted: number;
  /** Integer percentage from 0 to 100. */
  weeklyProgress: number;
};

export type DashboardRecentType =
  | "note"
  | "whiteboard"
  | "board"
  | "template"
  | "page";

export type DashboardRecentItem = {
  /** A stable, URL-safe identifier across the different resource types. */
  id: string;
  type: DashboardRecentType;
  title: string;
  subtitle: string | null;
  href: string;
  color: ColorToken;
  /** ISO timestamp used for sorting and display. */
  updatedAt: string;
};

export type DashboardInsightTone = "info" | "success" | "warning" | "neutral";

export type DashboardInsight = {
  id: string;
  title: string;
  description: string;
  tone: DashboardInsightTone;
};

export type DashboardQuickActionKey =
  | "create-task"
  | "add-reminder"
  | "create-note"
  | "open-whiteboard"
  | "ask-ai"
  | "generate-template";

export type DashboardQuickAction = {
  key: DashboardQuickActionKey;
  name: string;
  description: string;
  href: string;
  enabled: boolean;
  disabledReason: string | null;
};

export type DashboardSection =
  | "features"
  | "calendar"
  | "tasks"
  | "notes"
  | "whiteboard"
  | "ai"
  | "templates"
  | "pages";

export type DashboardProfile = {
  name: string;
  firstName: string;
  email: string;
};

export type DashboardData = {
  profile: DashboardProfile;
  features: DashboardFeature[];
  upcoming: DashboardUpcomingItem[];
  recent: DashboardRecentItem[];
  taskSummary: DashboardTaskSummary;
  insights: DashboardInsight[];
  quickActions: DashboardQuickAction[];
  /** Section-level errors allow the rest of the dashboard to remain useful. */
  errors: Partial<Record<DashboardSection, string>>;
};
