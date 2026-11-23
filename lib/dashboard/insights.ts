import type { DashboardInsight } from "@/lib/dashboard/types";

export type DashboardActivityCounts = {
  calendar: number;
  tasks: number;
  notes: number;
  whiteboards: number;
  templates: number;
  pages: number;
};

export type DashboardInsightInput = {
  overdue: number;
  weeklyTotal: number;
  weeklyCompleted: number;
  weeklyProgress: number;
  remindersToday: number;
  highPriorityPending: number;
  activity: DashboardActivityCounts;
};

const ACTIVITY_LABELS: Record<keyof DashboardActivityCounts, string> = {
  calendar: "Calendar",
  tasks: "Tasks",
  notes: "Notes",
  whiteboards: "Whiteboards",
  templates: "AI Templates",
  pages: "Pages",
};

/**
 * Builds useful, factual summaries from the user's own activity. The rules are
 * deliberately deterministic so the dashboard stays fast, private, and
 * available even when an AI provider is offline.
 */
export function buildDashboardInsights(
  input: DashboardInsightInput,
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  if (input.overdue > 0) {
    insights.push({
      id: "overdue",
      title: "Overdue work",
      description: `You have ${input.overdue} overdue ${
        input.overdue === 1 ? "task" : "tasks"
      }.`,
      tone: "warning",
    });
  }

  if (input.weeklyTotal > 0) {
    insights.push({
      id: "weekly-progress",
      title: "Weekly momentum",
      description: `You completed ${input.weeklyProgress}% of tasks due this week.`,
      tone: input.weeklyProgress >= 70 ? "success" : "info",
    });
  }

  const activityEntries = Object.entries(input.activity) as Array<
    [keyof DashboardActivityCounts, number]
  >;
  const sortedActivity = activityEntries.sort((a, b) => b[1] - a[1]);
  const mostActive = sortedActivity[0];
  const hasUniqueLeader =
    mostActive &&
    mostActive[1] > 0 &&
    (sortedActivity.length < 2 || mostActive[1] > sortedActivity[1]![1]);

  if (hasUniqueLeader) {
    insights.push({
      id: "most-active",
      title: "Most active area",
      description: `Your most active workspace was ${ACTIVITY_LABELS[mostActive[0]]} this week.`,
      tone: "info",
    });
  }

  if (input.remindersToday > 0) {
    insights.push({
      id: "reminders-today",
      title: "Today’s reminders",
      description: `You have ${input.remindersToday} upcoming ${
        input.remindersToday === 1 ? "reminder" : "reminders"
      } today.`,
      tone: "neutral",
    });
  }

  if (input.highPriorityPending > 0) {
    insights.push({
      id: "focus",
      title: "Suggested focus",
      description: `Finish your ${input.highPriorityPending} high-priority ${
        input.highPriorityPending === 1 ? "task" : "tasks"
      } first.`,
      tone: "warning",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "quiet-start",
      title: "A quiet start",
      description:
        "No activity insights yet. Create a task or note to begin building your workspace summary.",
      tone: "neutral",
    });
  }

  return insights;
}
