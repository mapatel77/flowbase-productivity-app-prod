"use client";

import {
  CalendarRange,
  CheckCheck,
  Monitor,
  Moon,
  Palette,
  Save,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { usePreferences } from "@/components/preferences-provider";
import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useSettingsSaver } from "@/components/settings/use-settings-saver";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PRIORITY_LABELS } from "@/lib/kanban/constants";
import { KANBAN_PRIORITIES } from "@/lib/kanban/types";
import {
  CALENDAR_VIEW_LABELS,
  CALENDAR_VIEW_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  type CalendarViewPreference,
  type ThemePreference,
  type UserSettings,
} from "@/lib/settings/types";
import { cn } from "@/lib/utils";

const themeIcons: Record<ThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function PreferencesSection() {
  const { settings } = usePreferences();
  const { save, pending } = useSettingsSaver();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = (mounted ? theme : settings.theme) as
    | ThemePreference
    | undefined;

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Appearance"
        description="Make the workspace feel right for the way you focus."
        icon={Palette}
        iconClassName="text-orange-500 dark:text-orange-400"
      >
        <div className="flex flex-col gap-2">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = themeIcons[option];
              const active = activeTheme === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setTheme(option);
                    void save(
                      { theme: option },
                      { key: "theme", success: "Theme updated", quiet: true },
                    );
                  }}
                  aria-pressed={active}
                  disabled={pending === "theme"}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {THEME_LABELS[option]}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            System follows your device&apos;s light or dark setting.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Workspace defaults"
        description="Small choices that keep new work consistent."
        icon={SlidersHorizontal}
        iconClassName="text-emerald-500 dark:text-emerald-400"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>
              <CalendarRange className="size-4 text-rose-500 dark:text-rose-400" />
              Default calendar view
            </Label>
            <Select
              value={settings.calendarDefaultView}
              onValueChange={(value) => {
                if (value === null) return;
                void save(
                  {
                    calendarDefaultView: value as CalendarViewPreference,
                  },
                  {
                    key: "calendar-view",
                    success: "Default calendar view updated",
                  },
                );
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    CALENDAR_VIEW_LABELS[value as CalendarViewPreference] ??
                    "Choose a view"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CALENDAR_VIEW_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {CALENDAR_VIEW_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              <CheckCheck className="size-4 text-sky-500 dark:text-sky-400" />
              Default task priority
            </Label>
            <Select
              value={settings.defaultTaskPriority}
              onValueChange={(value) => {
                if (value === null) return;
                void save(
                  {
                    defaultTaskPriority:
                      value as UserSettings["defaultTaskPriority"],
                  },
                  {
                    key: "task-priority",
                    success: "Default task priority updated",
                  },
                );
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    PRIORITY_LABELS[
                      value as UserSettings["defaultTaskPriority"]
                    ] ?? "Choose a priority"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {KANBAN_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SettingsDivider />

        <SettingsRow
          title="Auto-save"
          description="Save notes and pages automatically while you write. Turn this off to save manually."
        >
          <span className="flex items-center gap-2">
            <Save className="size-3.5 text-muted-foreground" />
            <Switch
              checked={settings.autoSaveEnabled}
              disabled={pending === "auto-save"}
              onCheckedChange={(checked) =>
                void save(
                  { autoSaveEnabled: checked },
                  {
                    key: "auto-save",
                    success: `Auto-save ${checked ? "enabled" : "disabled"}`,
                  },
                )
              }
              aria-label="Toggle auto-save"
            />
          </span>
        </SettingsRow>

        {!settings.autoSaveEnabled ? (
          <p className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            With auto-save off, remember to save with the editor&apos;s save
            shortcut before leaving a note or page.
          </p>
        ) : null}
      </SettingsSection>
    </div>
  );
}
