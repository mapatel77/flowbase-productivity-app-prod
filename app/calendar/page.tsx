import { CalendarX } from "lucide-react";
import { connection } from "next/server";

import { getCalendarData } from "@/app/calendar/actions";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  // The calendar is always rendered per request so it reflects the signed in
  // user and their latest tasks.
  await connection();

  const result = await getCalendarData();

  if (!result.ok) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <CalendarX className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            The calendar could not load
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <CalendarView
      initialCategories={result.data.categories}
      initialEntries={result.data.entries}
    />
  );
}
