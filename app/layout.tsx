import { ClerkProvider } from '@clerk/nextjs';
import { Fraunces, Nunito } from 'next/font/google';
import { AppShell } from '@/components/app-shell';
import { UserSync } from '@/components/user-sync';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tree = (
    <html lang="en" className={`${nunito.variable} ${fraunces.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>
        {isClerkConfigured ? <UserSync /> : null}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );

  if (!isClerkConfigured) {
    return tree;
  }

  return <ClerkProvider>{tree}</ClerkProvider>;
}
