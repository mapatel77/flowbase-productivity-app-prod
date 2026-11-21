"use client";

import { useCallback, useState } from "react";

import { updateUserSettings } from "@/app/settings/actions";
import { usePreferences } from "@/components/preferences-provider";
import { toast } from "@/components/ui/toast";
import type { UserSettings, UserSettingsPatch } from "@/lib/settings/types";

/**
 * Saves a settings patch, updates the shared preferences context immediately
 * and reports failures through a toast. `pending` holds the key of the control
 * currently being saved so individual switches can show a busy state.
 */
export function useSettingsSaver() {
  const { updatePreferences } = usePreferences();
  const [pending, setPending] = useState<string | null>(null);

  const save = useCallback(
    async (
      patch: UserSettingsPatch,
      options: { key?: string; success?: string; quiet?: boolean } = {},
    ) => {
      const key = options.key ?? "settings";
      updatePreferences(patch as Partial<UserSettings>);
      setPending(key);

      try {
        const result = await updateUserSettings(patch);

        if (!result.ok) {
          toast.add({
            title: "Could not save your settings",
            description: result.error,
            type: "error",
          });
          return false;
        }

        updatePreferences(result.data);

        if (!options.quiet) {
          toast.add({
            title: options.success ?? "Settings saved",
            description: "Your preference is now active everywhere.",
            type: "success",
          });
        }

        return true;
      } catch {
        toast.add({
          title: "Could not save your settings",
          description: "Check your connection and try again.",
          type: "error",
        });
        return false;
      } finally {
        setPending(null);
      }
    },
    [updatePreferences],
  );

  return { save, pending };
}
