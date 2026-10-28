"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, Search, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden w-72 lg:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search pages, notes and boards…"
            className="h-9 rounded-xl border-border/80 bg-card/70 pl-9 text-sm shadow-none"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell />
        </Button>

        <Button
          size="sm"
          className="hidden h-9 gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-3.5 font-medium text-white shadow-sm hover:from-sky-600 hover:to-violet-600 sm:inline-flex"
        >
          <Sparkles className="size-4" />
          Ask AI
        </Button>

        <Button
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-primary px-3.5 font-medium text-primary-foreground shadow-sm hover:bg-primary/85"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New</span>
        </Button>

        <Link href="/settings" className="ml-1 hidden sm:block" aria-label="Account">
          <Avatar size="sm">
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-rose-400 text-[10px] font-semibold text-white">
              AP
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
