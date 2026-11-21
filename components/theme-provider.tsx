"use client";

import { ThemeProvider } from "next-themes";

import type { ThemePreference } from "@/lib/settings/types";

export function AppThemeProvider({
  defaultTheme,
  children,
}: {
  defaultTheme: ThemePreference;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      storageKey="flowbase-theme"
    >
      {children}
    </ThemeProvider>
  );
}
