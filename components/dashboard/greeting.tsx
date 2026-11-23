import { format } from "date-fns";

import type { DashboardProfile } from "@/lib/dashboard/types";

type GreetingProps = {
  profile: DashboardProfile;
  dueToday: number;
};

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ profile, dueToday }: GreetingProps) {
  const now = new Date();
  const displayName = profile.firstName.trim() || profile.name.trim();
  const taskLabel = dueToday === 1 ? "task" : "tasks";

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[28px]">
        {getGreeting(now.getHours())}, {displayName}
      </h1>
      <p className="text-sm text-muted-foreground">
        {format(now, "EEEE, d MMMM")} · {dueToday} {taskLabel} due today
      </p>
    </div>
  );
}
