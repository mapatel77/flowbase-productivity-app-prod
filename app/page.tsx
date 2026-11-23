import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/app/dashboard/queries";
import { isClerkConfigured } from "@/lib/calendar/user";

export default async function DashboardPage() {
  // The dashboard is always rendered per request so every card reflects live workspace data.
  await connection();

  // In Clerk-enabled production, redirect unauthenticated users to sign in
  // rather than showing demo data or a raw error.
  if (isClerkConfigured) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in");
    }
  }

  const data = await getDashboardData();

  return <DashboardView data={data} />;
}