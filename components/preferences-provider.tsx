"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DEFAULT_SETTINGS } from "@/lib/settings/constants";
import type { UserSettings } from "@/lib/settings/types";

const FALLBACK_SETTINGS: UserSettings = {
  id: 0,
  userId: 0,
  ...DEFAULT_SETTINGS,
  aiAssistantLastUsedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

type PreferencesContextValue = {
  settings: UserSettings;
  updatePreferences: (patch: Partial<UserSettings>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue>({
  settings: FALLBACK_SETTINGS,
  updatePreferences: () => {},
});

export function PreferencesProvider({
  settings,
  children,
}: {
  settings: UserSettings;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(settings);

  useEffect(() => {
    setValue(settings);
  }, [settings]);

  const updatePreferences = useCallback((patch: Partial<UserSettings>) => {
    setValue((current) => ({ ...current, ...patch }));
  }, []);

  const contextValue = useMemo(
    () => ({ settings: value, updatePreferences }),
    [value, updatePreferences],
  );

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
