CREATE TABLE "calendar_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'sky' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"kind" text DEFAULT 'task' NOT NULL,
	"category_id" integer,
	"scheduled_date" date,
	"scheduled_time" time,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "calendar_categories" ADD CONSTRAINT "calendar_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_category_id_calendar_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."calendar_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_categories_user_name_idx" ON "calendar_categories" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "calendar_categories_user_idx" ON "calendar_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_entries_user_idx" ON "calendar_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_entries_user_date_idx" ON "calendar_entries" USING btree ("user_id","scheduled_date");