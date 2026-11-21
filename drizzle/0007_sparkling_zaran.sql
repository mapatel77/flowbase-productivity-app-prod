CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ai_model" text DEFAULT 'server-default' NOT NULL,
	"ai_default_mode" text DEFAULT 'grammar' NOT NULL,
	"ai_tone" text DEFAULT 'professional' NOT NULL,
	"ai_custom_instructions" text DEFAULT '' NOT NULL,
	"ai_refine_enabled" boolean DEFAULT true NOT NULL,
	"ai_assistant_enabled" boolean DEFAULT true NOT NULL,
	"ai_template_builder_enabled" boolean DEFAULT true NOT NULL,
	"ai_diagram_enabled" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"calendar_default_view" text DEFAULT 'month' NOT NULL,
	"default_task_priority" text DEFAULT 'medium' NOT NULL,
	"auto_save_enabled" boolean DEFAULT true NOT NULL,
	"notify_task_reminders" boolean DEFAULT true NOT NULL,
	"notify_due_dates" boolean DEFAULT true NOT NULL,
	"notify_weekly_digest" boolean DEFAULT false NOT NULL,
	"notify_product_updates" boolean DEFAULT false NOT NULL,
	"privacy_profile_discoverable" boolean DEFAULT true NOT NULL,
	"privacy_show_activity" boolean DEFAULT true NOT NULL,
	"privacy_analytics" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "calendar_categories_user_name_idx";--> statement-breakpoint
ALTER TABLE "calendar_categories" ADD COLUMN "scope" text DEFAULT 'calendar' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_categories" ADD COLUMN "icon" text DEFAULT 'Tag' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_category_id_calendar_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."calendar_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_categories_user_scope_name_idx" ON "calendar_categories" USING btree ("user_id","scope","name");--> statement-breakpoint
CREATE INDEX "calendar_categories_user_scope_idx" ON "calendar_categories" USING btree ("user_id","scope");