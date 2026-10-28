"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Routes that render full-screen without the app shell. */
const standaloneRoutes = ["/sign-in", "/sign-up"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStandalone = standaloneRoutes.some((route) => pathname.startsWith(route));

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem" } as CSSProperties}>
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset>
          <AppTopbar />
          <div className="cozy-glow flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
