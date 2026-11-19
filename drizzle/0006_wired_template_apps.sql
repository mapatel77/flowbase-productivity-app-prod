CREATE TABLE "template_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"app_name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'Layout' NOT NULL,
	"color" text DEFAULT 'sky' NOT NULL,
	"layout" text DEFAULT 'single-page' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sidebar_position" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_apps" ADD CONSTRAINT "template_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_apps_user_idx" ON "template_apps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "template_apps_user_sidebar_idx" ON "template_apps" USING btree ("user_id","sidebar_position");
