"use client";

import { ThemeProvider } from "next-themes";

import type { ThemePreference } from "@/lib/settings/types";

// The server-rendered script must remain executable to apply the saved theme
// before paint. A client-created script is inert and does not need to run.
const scriptProps =
  typeof window === "undefined"
    ? { type: "text/javascript" }
    : { type: "text/plain" };

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
      scriptProps={scriptProps}
    >
      {children}
    </ThemeProvider>
  );
}
