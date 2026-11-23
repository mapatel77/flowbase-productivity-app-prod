import type {
  DashboardData,
  DashboardSection,
} from "@/lib/dashboard/types";

import { DashboardSectionError } from "@/components/dashboard/dashboard-section-error";
import { FeatureStatusCards } from "@/components/dashboard/feature-status-cards";
import { Greeting } from "@/components/dashboard/greeting";
import { InsightsList } from "@/components/dashboard/insights-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentItems } from "@/components/dashboard/recent-items";
import { TaskSummary } from "@/components/dashboard/task-summary";
import { UpcomingItems } from "@/components/dashboard/upcoming-items";

const sectionTitles: Record<DashboardSection, string> = {
  features: "Workspace status",
  calendar: "Calendar",
  tasks: "Tasks",
  notes: "Notes",
  whiteboard: "Whiteboard",
  ai: "AI assistant",
  templates: "Templates",
  pages: "Pages",
};

function SectionError({
  section,
  message,
}: {
  section: DashboardSection;
  message: string;
}) {
  return (
    <DashboardSectionError
      title={`${sectionTitles[section]} could not load`}
      message={message}
    />
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const {
    profile,
    features,
    upcoming,
    recent,
    taskSummary,
    insights,
    quickActions,
    errors,
  } = data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Greeting profile={profile} dueToday={taskSummary.dueToday} />
        <p className="max-w-2xl text-sm text-muted-foreground">
          Here is what is happening across your workspace today.
        </p>
      </header>

      {errors.features ? (
        <SectionError section="features" message={errors.features} />
      ) : (
        <FeatureStatusCards features={features} />
      )}

      <QuickActions actions={quickActions} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {errors.calendar ? (
            <SectionError section="calendar" message={errors.calendar} />
          ) : null}
          {errors.tasks ? (
            <SectionError section="tasks" message={errors.tasks} />
          ) : null}
          {!errors.calendar && !errors.tasks ? (
            <UpcomingItems items={upcoming} />
          ) : null}
        </div>

        <div className="space-y-4">
          {errors.notes ? (
            <SectionError section="notes" message={errors.notes} />
          ) : null}
          {errors.whiteboard ? (
            <SectionError section="whiteboard" message={errors.whiteboard} />
          ) : null}
          {errors.templates ? (
            <SectionError section="templates" message={errors.templates} />
          ) : null}
          {errors.pages ? (
            <SectionError section="pages" message={errors.pages} />
          ) : null}
          {!errors.notes &&
          !errors.whiteboard &&
          !errors.templates &&
          !errors.pages ? (
            <RecentItems items={recent} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {errors.tasks ? null : <TaskSummary summary={taskSummary} />}
        {errors.ai ? (
          <SectionError section="ai" message={errors.ai} />
        ) : (
          <InsightsList insights={insights} />
        )}
      </div>
    </div>
  );
}
