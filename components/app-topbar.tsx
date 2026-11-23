"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { allNavigation, isNavItemActive } from "@/lib/navigation";

export function AppTopbar() {
  const pathname = usePathname();
  const current = allNavigation.find((item) =>
    isNavItemActive(pathname, item.href),
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="md:hidden" />

      <div className="flex min-w-0 items-center gap-2">
        {current ? (
          <>
            <current.icon className={`size-4 shrink-0 ${current.iconClassName}`} />
            <span className="truncate font-heading text-[15px] font-semibold tracking-tight">
              {current.title}
            </span>
          </>
        ) : (
          <span className="truncate font-heading text-[15px] font-semibold tracking-tight">
            Flowbase
          </span>
        )}
      </div>
    </header>
  );
}