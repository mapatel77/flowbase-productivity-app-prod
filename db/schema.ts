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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("calendar_categories_user_name_idx").on(table.userId, table.name),
    index("calendar_categories_user_idx").on(table.userId),
  ],
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CalendarCategory = typeof calendarCategories.$inferSelect;
export type NewCalendarCategory = typeof calendarCategories.$inferInsert;

export type CalendarEntry = typeof calendarEntries.$inferSelect;
export type NewCalendarEntry = typeof calendarEntries.$inferInsert;

export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert;

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;

export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type NewKanbanTask = typeof kanbanTasks.$inferInsert;
