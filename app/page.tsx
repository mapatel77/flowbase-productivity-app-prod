import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Flowbase — Your AI-Powered Productivity Workspace",
  description:
    "Flowbase combines Notion-style notes, Miro-style whiteboards, Kanban boards, calendar, and an AI assistant into one modern workspace for teams and individuals.",
};

export default function HomePage() {
  return <LandingPage />;
}
