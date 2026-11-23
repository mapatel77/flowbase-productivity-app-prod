import { formatDistanceToNow } from "date-fns";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";

import { db } from "@/db";
import {
  calendarCategories,
  calendarEntries,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  pages,
  spaces,
  templateApps,
  whiteboards,
} from "@/db/schema";
import { isColorToken, type ColorToken } from "@/lib/calendar/colors";
import { normalizeTime, toDateKey } from "@/lib/calendar/dates";
import {
  resolveAuthenticatedUserProfile,
  type CurrentUserProfile,
} from "@/lib/calendar/user";
import {
  buildDashboardInsights,
  type DashboardActivityCounts,
} from "@/lib/dashboard/insights";
import type {
  DashboardData,
  DashboardFeature,
  DashboardQuickAction,
  DashboardRecentItem,
  DashboardSection,
  DashboardTaskSummary,
  DashboardUpcomingItem,
} from "@/lib/dashboard/types";
import { getAccessibleBoardRoles } from "@/lib/kanban/access";
import { getUserDisplayName } from "@/lib/liveblocks/user-color";
import { getAccessibleSpaceRoles } from "@/lib/pages/access";
import {
  createFallbackSettings,
  getUserSettings,
} from "@/lib/settings/queries";
import type { UserSettings } from "@/lib/settings/types";

const DONE_COLUMN_NAMES = new Set(["done", "complete", "completed"]);
const RECENT_LIMIT = 8;
const UPCOMING_LIMIT = 8;

type CalendarLoad = {
  totalScheduled: number;
  upcomingCount: number;
  upcoming: DashboardUpcomingItem[];
  remindersToday: number;
  activityCount: number;
};

type KanbanLoad = {
  boardCount: number;
  tasks: Array<{
    id: number;
    boardId: number;
    columnId: number;
    dueDate: string | null;
    priority: string;
    completed: boolean;
  }>;
  recent: DashboardRecentItem[];
  summary: DashboardTaskSummary;
  highPriorityPending: number;
  activityCount: number;
  error?: string;
};

type NotesLoad = {
  count: number;
  pinnedCount: number;
  recent: DashboardRecentItem[];
  activityCount: number;
  error?: string;
};

type WhiteboardsLoad = {
  count: number;
  updatedThisWeek: number;
  recent: DashboardRecentItem[];
  latestId: number | null;
  activityCount: number;
  error?: string;
};

type TemplatesLoad = {
  count: number;
  recent: DashboardRecentItem[];
  lastGeneratedAt: Date | null;
  activityCount: number;
  error?: string;
};

type PagesLoad = {
  recent: DashboardRecentItem[];
  activityCount: number;
  error?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "This section could not be loaded.";
}

function relativeTime(value: Date | null): string {
  if (!value) return "Not used yet";
  return formatDistanceToNow(value, { addSuffix: true });
}

function safeColor(value: string | null | undefined, fallback: ColorToken): ColorToken {
  return isColorToken(value) ? value : fallback;
}

async function loadCalendar(
  userId: number,
  todayKey: string,
  weekAgo: Date,
): Promise<CalendarLoad> {
  const [categoryRows, entryRows] = await Promise.all([
    db
      .select({
        id: calendarCategories.id,
        name: calendarCategories.name,
        color: calendarCategories.color,
      })
      .from(calendarCategories)
      .where(eq(calendarCategories.userId, userId)),
    db
      .select({
        id: calendarEntries.id,
        title: calendarEntries.title,
        kind: calendarEntries.kind,
        categoryId: calendarEntries.categoryId,
        scheduledDate: calendarEntries.scheduledDate,
        scheduledTime: calendarEntries.scheduledTime,
        done: calendarEntries.done,
        updatedAt: calendarEntries.updatedAt,
      })
      .from(calendarEntries)
      .where(eq(calendarEntries.userId, userId)),
  ]);

  const categoryById = new Map(
    categoryRows.map((category) => [
      category.id,
      {
        name: category.name,
        color: safeColor(category.color, "sky"),
      },
    ]),
  );

  const upcoming: DashboardUpcomingItem[] = entryRows
    .filter(
      (entry) =>
        !entry.done &&
        entry.scheduledDate !== null &&
        entry.scheduledDate >= todayKey,
    )
    .sort((a, b) => {
      const dateOrder = (a.scheduledDate ?? "").localeCompare(
        b.scheduledDate ?? "",
      );
      if (dateOrder !== 0) return dateOrder;
      const timeOrder = (normalizeTime(a.scheduledTime) ?? "").localeCompare(
        normalizeTime(b.scheduledTime) ?? "",
      );
      if (timeOrder !== 0) return timeOrder;
      return a.id - b.id;
    })
    .slice(0, UPCOMING_LIMIT)
    .map((entry) => {
      const category = entry.categoryId
        ? categoryById.get(entry.categoryId)
        : undefined;
      return {
        id: entry.id,
        title: entry.title,
        date: entry.scheduledDate ?? todayKey,
        time: normalizeTime(entry.scheduledTime),
        kind: entry.kind === "reminder" ? "reminder" : "task",
        categoryId: entry.categoryId,
        categoryName: category?.name ?? null,
        color: category?.color ?? null,
      };
    });

  const remindersToday = entryRows.filter(
    (entry) =>
      !entry.done &&
      entry.kind === "reminder" &&
      entry.scheduledDate === todayKey,
  ).length;

  const upcomingCount = entryRows.filter(
    (entry) =>
      !entry.done &&
      entry.scheduledDate !== null &&
      entry.scheduledDate >= todayKey,
  ).length;

  return {
    totalScheduled: entryRows.filter((entry) => entry.scheduledDate !== null).length,
    upcomingCount,
    upcoming,
    remindersToday,
    activityCount: entryRows.filter(
      (entry) => entry.updatedAt >= weekAgo,
    ).length,
  };
}

async function loadKanban(
  profile: CurrentUserProfile,
  todayKey: string,
  weekStartKey: string,
  weekEndKey: string,
  weekAgo: Date,
): Promise<KanbanLoad> {
  const roles = await getAccessibleBoardRoles(profile);
  const boardIds = [...roles.keys()];

  if (boardIds.length === 0) {
    return {
      boardCount: 0,
      tasks: [],
      recent: [],
      summary: {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        progress: 0,
        dueToday: 0,
        weeklyTotal: 0,
        weeklyCompleted: 0,
        weeklyProgress: 0,
      },
      highPriorityPending: 0,
      activityCount: 0,
    };
  }

  const [boardRows, columnRows, taskRows] = await Promise.all([
    db
      .select({
        id: kanbanBoards.id,
        name: kanbanBoards.name,
        color: kanbanBoards.color,
        updatedAt: kanbanBoards.updatedAt,
      })
      .from(kanbanBoards)
      .where(inArray(kanbanBoards.id, boardIds)),
    db
      .select({
        id: kanbanColumns.id,
        boardId: kanbanColumns.boardId,
        name: kanbanColumns.name,
        position: kanbanColumns.position,
      })
      .from(kanbanColumns)
      .where(inArray(kanbanColumns.boardId, boardIds)),
    db
      .select({
        id: kanbanTasks.id,
        boardId: kanbanTasks.boardId,
        columnId: kanbanTasks.columnId,
        dueDate: kanbanTasks.dueDate,
        priority: kanbanTasks.priority,
        updatedAt: kanbanTasks.updatedAt,
      })
      .from(kanbanTasks)
      .where(inArray(kanbanTasks.boardId, boardIds)),
  ]);

  const columnsByBoard = new Map<number, typeof columnRows>();
  for (const column of columnRows) {
    const list = columnsByBoard.get(column.boardId) ?? [];
    list.push(column);
    columnsByBoard.set(column.boardId, list);
  }

  const doneColumnIds = new Set<number>();
  for (const [boardId, boardColumns] of columnsByBoard) {
    const sorted = [...boardColumns].sort(
      (a, b) => a.position - b.position || a.id - b.id,
    );
    const explicitDone = sorted.find((column) =>
      DONE_COLUMN_NAMES.has(column.name.trim().toLowerCase()),
    );
    const fallbackDone = sorted.at(-1);
    const doneColumn = explicitDone ?? fallbackDone;
    if (doneColumn) doneColumnIds.add(doneColumn.id);
    if (!doneColumn) continue;
    // Keep the board key present even when it has no columns.
    columnsByBoard.set(boardId, sorted);
  }

  const tasks = taskRows.map((task) => ({
    ...task,
    completed: doneColumnIds.has(task.columnId),
  }));

  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(
    (task) => !task.completed && task.dueDate !== null && task.dueDate < todayKey,
  ).length;
  const dueToday = tasks.filter(
    (task) => !task.completed && task.dueDate === todayKey,
  ).length;
  const weeklyTasks = tasks.filter(
    (task) =>
      task.dueDate !== null &&
      task.dueDate >= weekStartKey &&
      task.dueDate <= weekEndKey,
  );
  const weeklyCompleted = weeklyTasks.filter((task) => task.completed).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const weeklyProgress =
    weeklyTasks.length === 0
      ? 0
      : Math.round((weeklyCompleted / weeklyTasks.length) * 100);
  const highPriorityPending = tasks.filter(
    (task) => !task.completed && task.priority === "high",
  ).length;

  const latestTaskUpdateByBoard = new Map<number, number>();
  for (const task of taskRows) {
    const current = latestTaskUpdateByBoard.get(task.boardId) ?? 0;
    latestTaskUpdateByBoard.set(
      task.boardId,
      Math.max(current, task.updatedAt.getTime()),
    );
  }

  const recent = boardRows
    .map((board) => {
      const boardTaskUpdate = latestTaskUpdateByBoard.get(board.id) ?? 0;
      const updatedAt = new Date(
        Math.max(board.updatedAt.getTime(), boardTaskUpdate),
      );
      return {
        id: `board-${board.id}`,
        type: "board" as const,
        title: board.name,
        subtitle: "Kanban board",
        href: `/tasks?board=${board.id}`,
        color: safeColor(board.color, "sky"),
        updatedAt: updatedAt.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return {
    boardCount: boardRows.length,
    tasks,
    recent,
    summary: {
      total,
      completed,
      pending,
      overdue,
      progress,
      dueToday,
      weeklyTotal: weeklyTasks.length,
      weeklyCompleted,
      weeklyProgress,
    },
    highPriorityPending,
    activityCount: taskRows.filter((task) => task.updatedAt >= weekAgo).length,
  };
}

async function loadNotes(
  userId: number,
  weekAgo: Date,
): Promise<NotesLoad> {
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      color: notes.color,
      pinned: notes.pinned,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt));

  return {
    count: rows.length,
    pinnedCount: rows.filter((note) => note.pinned).length,
    recent: rows.map((note) => ({
      id: `note-${note.id}`,
      type: "note" as const,
      title: note.title,
      subtitle: "Note",
      href: `/notes?note=${note.id}`,
      color: safeColor(note.color, "amber"),
      updatedAt: note.updatedAt.toISOString(),
    })),
    activityCount: rows.filter((note) => note.updatedAt >= weekAgo).length,
  };
}

async function loadWhiteboards(
  userId: number,
  weekAgo: Date,
): Promise<WhiteboardsLoad> {
  const rows = await db
    .select({
      id: whiteboards.id,
      name: whiteboards.name,
      color: whiteboards.color,
      updatedAt: whiteboards.updatedAt,
    })
    .from(whiteboards)
    .where(eq(whiteboards.userId, userId))
    .orderBy(desc(whiteboards.updatedAt));

  const recent = rows.map((board) => ({
    id: `whiteboard-${board.id}`,
    type: "whiteboard" as const,
    title: board.name,
    subtitle: "Whiteboard",
    href: `/whiteboard?whiteboard=${board.id}`,
    color: safeColor(board.color, "emerald"),
    updatedAt: board.updatedAt.toISOString(),
  }));

  return {
    count: rows.length,
    updatedThisWeek: rows.filter((board) => board.updatedAt >= weekAgo).length,
    recent,
    latestId: rows[0]?.id ?? null,
    activityCount: rows.filter((board) => board.updatedAt >= weekAgo).length,
  };
}

async function loadTemplates(
  userId: number,
  weekAgo: Date,
): Promise<TemplatesLoad> {
  const rows = await db
    .select({
      id: templateApps.id,
      appName: templateApps.appName,
      color: templateApps.color,
      createdAt: templateApps.createdAt,
      updatedAt: templateApps.updatedAt,
    })
    .from(templateApps)
    .where(eq(templateApps.userId, userId))
    .orderBy(desc(templateApps.updatedAt));

  const lastGeneratedAt = rows.reduce<Date | null>((latest, app) => {
    const value = app.updatedAt > app.createdAt ? app.updatedAt : app.createdAt;
    return !latest || value > latest ? value : latest;
  }, null);

  return {
    count: rows.length,
    recent: rows.map((app) => ({
      id: `template-${app.id}`,
      type: "template" as const,
      title: app.appName,
      subtitle: "AI template",
      href: `/template-builder/${app.id}`,
      color: safeColor(app.color, "violet"),
      updatedAt: app.updatedAt.toISOString(),
    })),
    lastGeneratedAt,
    activityCount: rows.filter(
      (app) => app.updatedAt >= weekAgo || app.createdAt >= weekAgo,
    ).length,
  };
}

async function loadPages(
  profile: CurrentUserProfile,
  weekAgo: Date,
): Promise<PagesLoad> {
  const roles = await getAccessibleSpaceRoles(profile);
  const spaceIds = [...roles.keys()];

  if (spaceIds.length === 0) {
    return { recent: [], activityCount: 0 };
  }

  const [spaceRows, pageRows] = await Promise.all([
    db
      .select({
        id: spaces.id,
        name: spaces.name,
        color: spaces.color,
      })
      .from(spaces)
      .where(inArray(spaces.id, spaceIds)),
    db
      .select({
        id: pages.id,
        spaceId: pages.spaceId,
        title: pages.title,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(
        and(
          inArray(pages.spaceId, spaceIds),
          eq(pages.archived, false),
        ),
      )
      .orderBy(desc(pages.updatedAt)),
  ]);

  const spaceById = new Map(
    spaceRows.map((space) => [
      space.id,
      { name: space.name, color: safeColor(space.color, "indigo") },
    ]),
  );

  return {
    recent: pageRows.map((page) => {
      const space = spaceById.get(page.spaceId);
      return {
        id: `page-${page.id}`,
        type: "page" as const,
        title: page.title,
        subtitle: space?.name ?? "Page",
        href: `/pages/${page.spaceId}/${page.id}`,
        color: space?.color ?? "indigo",
        updatedAt: page.updatedAt.toISOString(),
      };
    }),
    activityCount: pageRows.filter((page) => page.updatedAt >= weekAgo).length,
  };
}

function featureCards(input: {
  calendar: CalendarLoad | null;
  kanban: KanbanLoad | null;
  notes: NotesLoad | null;
  whiteboards: WhiteboardsLoad | null;
  settings: UserSettings;
  templates: TemplatesLoad | null;
}): DashboardFeature[] {
  const calendar = input.calendar;
  const kanban = input.kanban;
  const noteData = input.notes;
  const whiteboardData = input.whiteboards;
  const templates = input.templates;
  const settings = input.settings;

  return [
    {
      key: "calendar",
      name: "Calendar",
      href: "/calendar",
      status: calendar ? (calendar.totalScheduled > 0 ? "active" : "ready") : "error",
      statusLabel: calendar
        ? calendar.totalScheduled > 0
          ? "Active"
          : "Ready"
        : "Unavailable",
      stats: [
        {
          label: "Scheduled",
          value: String(calendar?.totalScheduled ?? 0),
        },
        {
          label: "Upcoming",
          value: String(calendar?.upcomingCount ?? 0),
        },
      ],
    },
    {
      key: "tasks",
      name: "Kanban / Tasks",
      href: "/tasks",
      status: kanban ? (kanban.boardCount > 0 ? "active" : "ready") : "error",
      statusLabel: kanban
        ? kanban.boardCount > 0
          ? "Active"
          : "Ready"
        : "Unavailable",
      stats: [
        { label: "Boards", value: String(kanban?.boardCount ?? 0) },
        { label: "Tasks", value: String(kanban?.summary.total ?? 0) },
      ],
    },
    {
      key: "notes",
      name: "Notes",
      href: "/notes",
      status: noteData ? (noteData.count > 0 ? "active" : "ready") : "error",
      statusLabel: noteData
        ? noteData.count > 0
          ? "Active"
          : "Ready"
        : "Unavailable",
      stats: [
        { label: "Notes", value: String(noteData?.count ?? 0) },
        { label: "Pinned", value: String(noteData?.pinnedCount ?? 0) },
      ],
    },
    {
      key: "whiteboard",
      name: "Whiteboard",
      href: "/whiteboard",
      status: whiteboardData
        ? whiteboardData.count > 0
          ? "active"
          : "ready"
        : "error",
      statusLabel: whiteboardData
        ? whiteboardData.count > 0
          ? "Active"
          : "Ready"
        : "Unavailable",
      stats: [
        { label: "Boards", value: String(whiteboardData?.count ?? 0) },
        {
          label: "Updated this week",
          value: String(whiteboardData?.updatedThisWeek ?? 0),
        },
      ],
    },
    {
      key: "ai-assistant",
      name: "AI Assistant",
      href: "/ai-assistant",
      status: settings.aiAssistantEnabled ? "active" : "disabled",
      statusLabel: settings.aiAssistantEnabled ? "Ready" : "Off",
      stats: [
        {
          label: "Assistant",
          value: settings.aiAssistantEnabled ? "Enabled" : "Disabled",
        },
        {
          label: "Last used",
          value: relativeTime(settings.aiAssistantLastUsedAt),
        },
      ],
    },
    {
      key: "template-builder",
      name: "AI Template Builder",
      href: "/template-builder",
      status: !settings.aiTemplateBuilderEnabled
        ? "disabled"
        : templates && templates.count > 0
          ? "active"
          : "ready",
      statusLabel: !settings.aiTemplateBuilderEnabled
        ? "Off"
        : templates && templates.count > 0
          ? "Active"
          : "Ready",
      stats: [
        { label: "Templates", value: String(templates?.count ?? 0) },
        {
          label: "Last generated",
          value: relativeTime(templates?.lastGeneratedAt ?? null),
        },
      ],
    },
  ];
}

function quickActions(input: {
  settings: UserSettings;
  latestWhiteboardId: number | null;
}): DashboardQuickAction[] {
  const aiDisabledReason = input.settings.aiAssistantEnabled
    ? null
    : "Turn on AI Assistant in Settings to use this action.";
  const templateDisabledReason = input.settings.aiTemplateBuilderEnabled
    ? null
    : "Turn on the AI Template Builder in Settings to use this action.";

  return [
    {
      key: "create-task",
      name: "Create Task",
      description: "Add work to a Kanban board",
      href: "/tasks?action=create-task",
      enabled: true,
      disabledReason: null,
    },
    {
      key: "add-reminder",
      name: "Add Calendar Reminder",
      description: "Schedule a task or reminder",
      href: "/calendar?action=reminder",
      enabled: true,
      disabledReason: null,
    },
    {
      key: "create-note",
      name: "Create Note",
      description: "Capture a thought or idea",
      href: "/notes?action=create",
      enabled: true,
      disabledReason: null,
    },
    {
      key: "open-whiteboard",
      name: "Open Whiteboard",
      description: "Jump back into your canvases",
      href: input.latestWhiteboardId
        ? `/whiteboard?whiteboard=${input.latestWhiteboardId}`
        : "/whiteboard",
      enabled: true,
      disabledReason: null,
    },
    {
      key: "ask-ai",
      name: "Ask AI Assistant",
      description: "Plan, summarise and take action",
      href: "/ai-assistant",
      enabled: input.settings.aiAssistantEnabled,
      disabledReason: aiDisabledReason,
    },
    {
      key: "generate-template",
      name: "Generate AI Template",
      description: "Create a reusable mini app",
      href: "/template-builder?action=generate",
      enabled: input.settings.aiTemplateBuilderEnabled,
      disabledReason: templateDisabledReason,
    },
  ];
}

function settledValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  section: DashboardSection,
  errors: Partial<Record<DashboardSection, string>>,
): T {
  if (result.status === "fulfilled") return result.value;
  errors[section] = errorMessage(result.reason);
  return fallback;
}

/** Loads the complete, user-scoped overview shown by the dashboard. */
export async function getDashboardData(): Promise<DashboardData> {
  const profile = await resolveAuthenticatedUserProfile();
  if (!profile) {
    throw new Error(
      "Your workspace could not be loaded. Sign in again and try refreshing this page.",
    );
  }

  const now = new Date();
  const todayKey = toDateKey(now);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = new Date(now);
  const weekDay = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - weekDay);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartKey = toDateKey(weekStart);
  const weekEndKey = toDateKey(weekEnd);

  const [
    calendarResult,
    kanbanResult,
    notesResult,
    whiteboardsResult,
    templatesResult,
    pagesResult,
    settingsResult,
  ] = await Promise.allSettled([
    loadCalendar(profile.id, todayKey, weekAgo),
    loadKanban(profile, todayKey, weekStartKey, weekEndKey, weekAgo),
    loadNotes(profile.id, weekAgo),
    loadWhiteboards(profile.id, weekAgo),
    loadTemplates(profile.id, weekAgo),
    loadPages(profile, weekAgo),
    getUserSettings(profile.id),
  ]);

  const errors: Partial<Record<DashboardSection, string>> = {};
  const calendar = settledValue<CalendarLoad | null>(
    calendarResult,
    null,
    "calendar",
    errors,
  );
  const kanban = settledValue<KanbanLoad | null>(
    kanbanResult,
    null,
    "tasks",
    errors,
  );
  const noteData = settledValue<NotesLoad | null>(
    notesResult,
    null,
    "notes",
    errors,
  );
  const whiteboardData = settledValue<WhiteboardsLoad | null>(
    whiteboardsResult,
    null,
    "whiteboard",
    errors,
  );
  const templates = settledValue<TemplatesLoad | null>(
    templatesResult,
    null,
    "templates",
    errors,
  );
  const pageData = settledValue<PagesLoad | null>(
    pagesResult,
    null,
    "pages",
    errors,
  );
  const settings = settledValue<UserSettings>(
    settingsResult,
    createFallbackSettings(profile.id),
    "ai",
    errors,
  );

  const recent = [
    ...(noteData?.recent ?? []),
    ...(whiteboardData?.recent ?? []),
    ...(kanban?.recent ?? []),
    ...(templates?.recent ?? []),
    ...(pageData?.recent ?? []),
  ]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, RECENT_LIMIT);

  const activity: DashboardActivityCounts = {
    calendar: calendar?.activityCount ?? 0,
    tasks: kanban?.activityCount ?? 0,
    notes: noteData?.activityCount ?? 0,
    whiteboards: whiteboardData?.activityCount ?? 0,
    templates: templates?.activityCount ?? 0,
    pages: pageData?.activityCount ?? 0,
  };

  const summary =
    kanban?.summary ??
    ({
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      progress: 0,
      dueToday: 0,
      weeklyTotal: 0,
      weeklyCompleted: 0,
      weeklyProgress: 0,
    } satisfies DashboardTaskSummary);

  const displayName = getUserDisplayName(profile.name, profile.email);
  const firstName = displayName.split(/\s+/)[0] || displayName;

  return {
    profile: {
      name: displayName,
      firstName,
      email: profile.email,
    },
    features: featureCards({
      calendar,
      kanban,
      notes: noteData,
      whiteboards: whiteboardData,
      settings,
      templates,
    }),
    upcoming: calendar?.upcoming ?? [],
    recent,
    taskSummary: summary,
    insights: buildDashboardInsights({
      overdue: summary.overdue,
      weeklyTotal: summary.weeklyTotal,
      weeklyCompleted: summary.weeklyCompleted,
      weeklyProgress: summary.weeklyProgress,
      remindersToday: calendar?.remindersToday ?? 0,
      highPriorityPending: kanban?.highPriorityPending ?? 0,
      activity,
    }),
    quickActions: quickActions({
      settings,
      latestWhiteboardId: whiteboardData?.latestId ?? null,
    }),
    errors,
  };
}
