"use client";

import { BellRing, Mail, Send } from "lucide-react";

import { usePreferences } from "@/components/preferences-provider";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useSettingsSaver } from "@/components/settings/use-settings-saver";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "@/lib/settings/types";

const notificationRows: Array<{
  key:
    | "notifyTaskReminders"
    | "notifyDueDates"
    | "notifyWeeklyDigest"
    | "notifyProductUpdates";
  title: string;
  description: string;
}> = [
  {
    key: "notifyTaskReminders",
    title: "Task reminders",
    description: "A gentle nudge when a task is due today or overdue.",
  },
  {
    key: "notifyDueDates",
    title: "Calendar due dates",
    description: "Reminders before scheduled events and calendar entries.",
  },
  {
    key: "notifyWeeklyDigest",
    title: "Weekly digest",
    description: "A Monday recap of focus time, open tasks and completed work.",
  },
  {
    key: "notifyProductUpdates",
    title: "Product updates",
    description: "Occasional notes about new Flowbase features and improvements.",
  },
];

export function NotificationsSection() {
  const { settings } = usePreferences();
  const { save, pending } = useSettingsSaver();

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Notifications"
        description="Choose what is worth interrupting your focus for."
        icon={BellRing}
        iconClassName="text-amber-500 dark:text-amber-400"
      >
        <div className="flex flex-col divide-y divide-border/60">
          {notificationRows.map((row) => (
            <SettingsRow
              key={row.key}
              title={row.title}
              description={row.description}
            >
              <Switch
                checked={settings[row.key]}
                disabled={pending === row.key}
                onCheckedChange={(checked) =>
                  void save(
                    { [row.key]: checked } as Partial<UserSettings>,
                    {
                      key: row.key,
                      success: `${row.title} ${checked ? "on" : "off"}`,
                      quiet: true,
                    },
                  )
                }
                aria-label={`Toggle ${row.title}`}
              />
            </SettingsRow>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200/70 bg-sky-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
          <Send className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Preferences are saved for your account now. In-app delivery is
            available today; email delivery follows your Clerk account email.
          </p>
        </div>
      </SettingsSection>

      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-[11.5px] text-muted-foreground">
        <Mail className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
        <p>
          You can turn notifications back on at any time. Nothing is sent while
          a toggle is off.
        </p>
      </div>
    </div>
  );
}
