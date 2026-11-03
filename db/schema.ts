import {
  boolean,
  date,
  index,
  integer,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CalendarCategory = typeof calendarCategories.$inferSelect;
export type NewCalendarCategory = typeof calendarCategories.$inferInsert;

export type CalendarEntry = typeof calendarEntries.$inferSelect;
export type NewCalendarEntry = typeof calendarEntries.$inferInsert;
