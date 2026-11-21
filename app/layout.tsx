import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Nunito } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { CollaborationProvider } from "@/components/liveblocks/collaboration-provider";
import { PreferencesProvider } from "@/components/preferences-provider";
import { AppThemeProvider } from "@/components/theme-provider";
import { UserSync } from "@/components/user-sync";
import { getCurrentUserSettings } from "@/lib/settings/queries";

import "./globals.css";
import type { Metadata } from "next";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowbase — Cozy productivity studio",
  description:
    "Flowbase blends Notion-style documents with a Miro-style whiteboard in one warm, focused workspace.",
};

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

const isLiveblocksConfigured = !!process.env.LIVEBLOCKS_SECRET_KEY;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getCurrentUserSettings();

  const tree = (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body style={{ margin: 0, padding: 0 }}>
        <AppThemeProvider defaultTheme={settings.theme}>
          <PreferencesProvider settings={settings}>
            {isClerkConfigured ? <UserSync /> : null}
            <CollaborationProvider enabled={isLiveblocksConfigured}>
              <AppShell>{children}</AppShell>
            </CollaborationProvider>
          </PreferencesProvider>
        </AppThemeProvider>
      </body>
    </html>
  );

  if (!isClerkConfigured) {
    return tree;
  }

  return <ClerkProvider>{tree}</ClerkProvider>;
}
