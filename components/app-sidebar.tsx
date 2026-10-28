"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { isNavItemActive, navGroups, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const workspace = {
  name: "Flowbase",
  tagline: "Cozy productivity studio",
};

function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-rose-400 via-orange-400 to-amber-300 text-white shadow-[0_6px_16px_-6px_color-mix(in_oklch,var(--primary)_75%,transparent)]",
        className,
      )}
    >
      <Boxes className="size-4" strokeWidth={2.2} />
    </span>
  );
}

function NavMenuItem({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.title}
        render={<Link href={item.href} />}
        className={cn(
          "h-8 gap-2 rounded-lg px-2 text-[13px] text-sidebar-foreground/75",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2!",
          isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        )}
      >
        <item.icon className={cn("size-4 shrink-0", item.iconClassName)} />
        {collapsed ? (
          <span className="sr-only">{item.title}</span>
        ) : (
          <span className="truncate">{item.title}</span>
        )}
      </SidebarMenuButton>
      {item.badge && !collapsed ? (
        <SidebarMenuBadge className="bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
          {item.badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="pb-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Link href="/" aria-label={workspace.name}>
              <Logo />
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleSidebar}
              className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <Link href="/" aria-label={workspace.name}>
              <Logo />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="font-heading truncate text-sm font-semibold tracking-tight">
                {workspace.name}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {workspace.tagline}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleSidebar}
              className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator className="mx-2 w-auto" />

      <SidebarContent className="flex flex-col gap-3 py-2.5">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="h-5 px-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/75 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  isActive={isNavItemActive(pathname, item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2 p-2">
        <SidebarSeparator className="mx-0 w-auto" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )}
              />
            }
          >
            <Command className="size-3.5 shrink-0" />
            {collapsed ? (
              <span className="sr-only">Keyboard shortcuts</span>
            ) : (
              <>
                <span>Shortcuts</span>
                <kbd className="ml-auto rounded border border-sidebar-border bg-card/70 px-1.5 py-0.5 text-[10px] font-medium">
                  ⌘B
                </kbd>
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-56"
            sideOffset={8}
          >
            <DropdownMenuLabel>Keyboard shortcuts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Search />
              Search workspace
              <span className="ml-auto text-[11px] text-muted-foreground">⌘K</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <PanelLeftClose />
              Toggle sidebar
              <span className="ml-auto text-[11px] text-muted-foreground">⌘B</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
