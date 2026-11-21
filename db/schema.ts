import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { NoteDocument } from "@/lib/notes/types";
import type { WhiteboardScene } from "@/lib/whiteboard/types";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Notes are soft deleted so the Trash section can restore them with their full
 * document intact. `content` stores Tiptap JSON, while `plainText` is kept in
 * sync for fast client-side title + body search.
 */
export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => calendarCategories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull().default("Untitled note"),
    color: text("color").notNull().default("amber"),
    content: jsonb("content")
      .$type<NoteDocument>()
      .notNull()
      .default({ type: "doc", content: [{ type: "paragraph" }] }),
    plainText: text("plain_text").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("notes_user_idx").on(table.userId),
    index("notes_user_deleted_idx").on(table.userId, table.deletedAt),
  ],
);

/**
 * Categories are fully user managed: a user creates, renames, recolours and
 * deletes their own categories. `color` stores a palette token key (see
 * `lib/calendar/colors.ts`) rather than a raw hex value so every rendered
 * colour stays inside the Flowbase theme.
 */
export const calendarCategories = pgTable(
  "calendar_categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("sky"),
    /** Which workspace surface owns this category (calendar, task, note, reminder). */
    scope: text("scope").notNull().default("calendar"),
    /** Lucide icon name shown beside the category. */
    icon: text("icon").notNull().default("Tag"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("calendar_categories_user_scope_name_idx").on(
      table.userId,
      table.scope,
      table.name,
    ),
    index("calendar_categories_user_idx").on(table.userId),
    index("calendar_categories_user_scope_idx").on(table.userId, table.scope),
  ],
);

/**
 * One row of user-scoped settings. Keeping this separate from `users` makes the
 * settings easy to extend without touching identity data, and gives every
 * signed-in person a single source of truth for AI, theme and notification
 * preferences.
 */
export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aiModel: text("ai_model").notNull().default("server-default"),
    aiDefaultMode: text("ai_default_mode").notNull().default("grammar"),
    aiTone: text("ai_tone").notNull().default("professional"),
    aiCustomInstructions: text("ai_custom_instructions").notNull().default(""),
    aiRefineEnabled: boolean("ai_refine_enabled").notNull().default(true),
    aiAssistantEnabled: boolean("ai_assistant_enabled").notNull().default(true),
    aiTemplateBuilderEnabled: boolean("ai_template_builder_enabled")
      .notNull()
      .default(true),
    aiDiagramEnabled: boolean("ai_diagram_enabled").notNull().default(true),
    theme: text("theme").notNull().default("system"),
    calendarDefaultView: text("calendar_default_view")
      .notNull()
      .default("month"),
    defaultTaskPriority: text("default_task_priority")
      .notNull()
      .default("medium"),
    autoSaveEnabled: boolean("auto_save_enabled").notNull().default(true),
    notifyTaskReminders: boolean("notify_task_reminders")
      .notNull()
      .default(true),
    notifyDueDates: boolean("notify_due_dates").notNull().default(true),
    notifyWeeklyDigest: boolean("notify_weekly_digest").notNull().default(false),
    notifyProductUpdates: boolean("notify_product_updates")
      .notNull()
      .default(false),
    privacyProfileDiscoverable: boolean("privacy_profile_discoverable")
      .notNull()
      .default(true),
    privacyShowActivity: boolean("privacy_show_activity")
      .notNull()
      .default(true),
    privacyAnalytics: boolean("privacy_analytics").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_settings_user_idx").on(table.userId)],
);

/**
 * A single entry powers both tasks and reminders — `kind` tells them apart.
 *
 * `scheduledDate === null` means the entry is an unscheduled *draft* living in
 * the Draft Task Panel. Dropping a draft onto a calendar day simply sets the
 * date, and dropping a scheduled entry back onto the panel clears it again.
 */
export const calendarEntries = pgTable(
  "calendar_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    kind: text("kind").notNull().default("task"),
    categoryId: integer("category_id").references(() => calendarCategories.id, {
      onDelete: "set null",
    }),
    scheduledDate: date("scheduled_date", { mode: "string" }),
    scheduledTime: time("scheduled_time"),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("calendar_entries_user_idx").on(table.userId),
    index("calendar_entries_user_date_idx").on(table.userId, table.scheduledDate),
  ],
);

/**
 * Kanban boards are fully user managed. `color` stores a palette token key
 * from `lib/calendar/colors.ts`, matching the Calendar module.
 */
export const kanbanBoards = pgTable(
  "kanban_boards",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("sky"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("kanban_boards_user_idx").on(table.userId),
    index("kanban_boards_user_created_idx").on(table.userId, table.createdAt),
  ],
);

/**
 * Board sharing is stored in Postgres so permissions survive Liveblocks
 * reconnects and can be checked by every server action.
 *
 * `userId` is filled in when the invited email already belongs to an account.
 * Pending invites keep it `null`; access is granted by matching `email` when
 * that person signs in for the first time.
 */
export const kanbanBoardMembers = pgTable(
  "kanban_board_members",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("kanban_board_members_board_email_idx").on(
      table.boardId,
      table.email,
    ),
    index("kanban_board_members_board_idx").on(table.boardId),
    index("kanban_board_members_user_idx").on(table.userId),
    index("kanban_board_members_email_idx").on(table.email),
  ],
);

/** A board owns an ordered list of columns (Todo, In Progress, Done, …). */
export const kanbanColumns = pgTable(
  "kanban_columns",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("kanban_columns_board_idx").on(table.boardId, table.position),
    index("kanban_columns_user_idx").on(table.userId),
  ],
);

/**
 * A task lives in exactly one column. `labels` is a small JSONB array of
 * `{ name, color }` pairs, and `calendarEntryId` links to the Calendar entry
 * created by the "sync with Calendar" toggle.
 */
export const kanbanTasks = pgTable(
  "kanban_tasks",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    columnId: integer("column_id")
      .notNull()
      .references(() => kanbanColumns.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: date("due_date", { mode: "string" }),
    priority: text("priority").notNull().default("medium"),
    labels: jsonb("labels")
      .$type<Array<{ name: string; color: string }>>()
      .notNull()
      .default([]),
    position: integer("position").notNull().default(0),
    calendarEntryId: integer("calendar_entry_id").references(
      () => calendarEntries.id,
      { onDelete: "set null" },
    ),
    notesLinked: boolean("notes_linked").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("kanban_tasks_column_idx").on(table.columnId, table.position),
    index("kanban_tasks_board_idx").on(table.boardId),
    index("kanban_tasks_user_idx").on(table.userId),
  ],
);

/**
 * Spaces are the top-level folders of the Pages & Spaces module. Every space
 * is owned by one user and can be shared with collaborators through
 * `spaceMembers`.
 *
 * `lastOpenedAt` powers the "Recently Opened" filter, while `favorite` and
 * `archived` keep the two special views on the spaces grid.
 */
export const spaces = pgTable(
  "spaces",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled space"),
    description: text("description"),
    color: text("color").notNull().default("violet"),
    favorite: boolean("favorite").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    lastOpenedAt: timestamp("last_opened_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("spaces_user_idx").on(table.userId),
    index("spaces_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

/**
 * Sharing is stored in Postgres so permissions survive reloads and can be
 * checked by every server action.
 *
 * `userId` is filled in when the invited email already belongs to an account.
 * Pending invites keep it `null`; access is granted by matching `email` when
 * that person signs in for the first time.
 */
export const spaceMembers = pgTable(
  "space_members",
  {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("space_members_space_email_idx").on(table.spaceId, table.email),
    index("space_members_space_idx").on(table.spaceId),
    index("space_members_user_idx").on(table.userId),
    index("space_members_email_idx").on(table.email),
  ],
);

/**
 * A page is a single document that always lives inside exactly one space.
 * `content` stores the Tiptap document, `plainText` is kept in sync for fast
 * client-side search, and `template` records the starting point the page was
 * created from.
 */
export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled page"),
    template: text("template").notNull().default("blank"),
    description: text("description"),
    content: jsonb("content")
      .$type<NoteDocument>()
      .notNull()
      .default({ type: "doc", content: [{ type: "paragraph" }] }),
    plainText: text("plain_text").notNull().default(""),
    favorite: boolean("favorite").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    commentsCount: integer("comments_count").notNull().default(0),
    linkedTasksCount: integer("linked_tasks_count").notNull().default(0),
    lastEditedById: integer("last_edited_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("pages_space_idx").on(table.spaceId),
    index("pages_space_updated_idx").on(table.spaceId, table.updatedAt),
    index("pages_user_idx").on(table.userId),
  ],
);

/**
 * Whiteboards are infinite-canvas boards backed by Excalidraw scenes. The
 * scene blob keeps the element list, the (serializable) app state and the
 * uploaded image payloads, so boards survive reloads without realtime.
 */
export const whiteboards = pgTable(
  "whiteboards",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled whiteboard"),
    color: text("color").notNull().default("emerald"),
    scene: jsonb("scene")
      .$type<WhiteboardScene>()
      .notNull()
      .default({
        elements: [],
        appState: { viewBackgroundColor: "#fbfaf7", gridSize: 20 },
        files: {},
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("whiteboards_user_idx").on(table.userId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type NoteRow = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export type CalendarCategory = typeof calendarCategories.$inferSelect;
export type NewCalendarCategory = typeof calendarCategories.$inferInsert;

export type UserSettingsRow = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type CalendarEntry = typeof calendarEntries.$inferSelect;
export type NewCalendarEntry = typeof calendarEntries.$inferInsert;

export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert;

export type KanbanBoardMember = typeof kanbanBoardMembers.$inferSelect;
export type NewKanbanBoardMember = typeof kanbanBoardMembers.$inferInsert;

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;

export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type NewKanbanTask = typeof kanbanTasks.$inferInsert;

export type WhiteboardRow = typeof whiteboards.$inferSelect;
export type NewWhiteboard = typeof whiteboards.$inferInsert;

export type SpaceRow = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;

export type SpaceMemberRow = typeof spaceMembers.$inferSelect;
export type NewSpaceMember = typeof spaceMembers.$inferInsert;

export type PageRow = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

/**
 * AI Template Builder apps. Each app is a single-page mini app generated from a
 * user prompt. `config` stores the full AI-generated TemplateAppConfig JSON and
 * `sidebarPosition` is null unless the user has pinned it to the sidebar
 * (max 3 pinned apps). Everything is user-scoped.
 */
export const templateApps = pgTable(
  "template_apps",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appName: text("app_name").notNull(),
    description: text("description"),
    icon: text("icon").notNull().default("Layout"),
    color: text("color").notNull().default("sky"),
    layout: text("layout").notNull().default("single-page"),
    config: jsonb("config")
      .notNull()
      .default({}),
    sidebarPosition: integer("sidebar_position"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("template_apps_user_idx").on(table.userId),
    index("template_apps_user_sidebar_idx").on(
      table.userId,
      table.sidebarPosition,
    ),
  ],
);

export type TemplateAppRow = typeof templateApps.$inferSelect;
export type NewTemplateApp = typeof templateApps.$inferInsert;
