import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Layers,
  LayoutDashboard,
  NotebookPen,
  Presentation,
  Settings,
  Sparkles,
  SquareKanban,
  WandSparkles,
} from "lucide-react";

export type NavItem = {
  /** Label shown in the sidebar. */
  title: string;
  /** Route the item links to. */
  href: string;
  /** Lucide icon used for the item. */
  icon: LucideIcon;
  /** Tailwind text colour applied to the icon (keeps the sidebar colourful). */
  iconClassName: string;
  /** Short copy used by the placeholder pages. */
  description: string;
  /** Optional badge rendered on the right of the label. */
  badge?: string;
};

export type NavGroup = {
  /** Small uppercase label above the group of items. */
  label: string;
  items: NavItem[];
};

const dashboard: NavItem = {
  title: "Dashboard",
  href: "/",
  icon: LayoutDashboard,
  iconClassName: "text-orange-500 dark:text-orange-400",
  description: "Your day at a glance — focus, tasks and recent spaces.",
};

const aiAssistant: NavItem = {
  title: "AI Assistant",
  href: "/ai-assistant",
  icon: Sparkles,
  iconClassName: "text-violet-500 dark:text-violet-400",
  description: "Summarise notes, draft pages and plan the week with Flow AI.",
  badge: "Beta",
};

const calendar: NavItem = {
  title: "Calendar",
  href: "/calendar",
  icon: CalendarDays,
  iconClassName: "text-rose-500 dark:text-rose-400",
  description: "Schedule time for deep work and see every deadline in one place.",
};

const tasks: NavItem = {
  title: "Task / Kanban",
  href: "/tasks",
  icon: SquareKanban,
  iconClassName: "text-sky-500 dark:text-sky-400",
  description: "Move work across boards with a calm, colourful kanban flow.",
  badge: "3",
};

const notes: NavItem = {
  title: "Notes",
  href: "/notes",
  icon: NotebookPen,
  iconClassName: "text-amber-500 dark:text-amber-400",
  description: "Capture quick thoughts and turn them into structured pages.",
};

const whiteboard: NavItem = {
  title: "Whiteboard",
  href: "/whiteboard",
  icon: Presentation,
  iconClassName: "text-emerald-500 dark:text-emerald-400",
  description: "Think out loud on an infinite canvas with your team.",
};

const pages: NavItem = {
  title: "Pages / Spaces",
  href: "/pages",
  icon: Layers,
  iconClassName: "text-indigo-500 dark:text-indigo-400",
  description: "Organise documents, wikis and boards into shared spaces.",
};

const templateBuilder: NavItem = {
  title: "AI Template Builder",
  href: "/template-builder",
  icon: WandSparkles,
  iconClassName: "text-fuchsia-500 dark:text-fuchsia-400",
  description: "Generate reusable page and whiteboard templates with AI.",
};

const settings: NavItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
  iconClassName: "text-slate-500 dark:text-slate-400",
  description: "Manage your profile, workspace, theme and integrations.",
};

/** Sidebar groups, rendered top to bottom with their labels. */
export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [dashboard, aiAssistant, calendar, tasks, notes],
  },
  {
    label: "Create & share",
    items: [whiteboard, pages, templateBuilder],
  },
  {
    label: "Account",
    items: [settings],
  },
];

/** Every navigation entry, flattened. */
export const allNavigation: NavItem[] = navGroups.flatMap((group) => group.items);

/**
 * Whether a navigation item should be highlighted for the current pathname.
 * The root route only matches exactly, otherwise every route would be "active".
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Look up a navigation item by its route. */
export function getNavItem(href: string): NavItem {
  const item = allNavigation.find((entry) => entry.href === href);

  if (!item) {
    throw new Error(`Unknown navigation item: ${href}`);
  }

  return item;
}
