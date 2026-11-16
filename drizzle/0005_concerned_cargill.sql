CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT 'Untitled page' NOT NULL,
	"template" text DEFAULT 'blank' NOT NULL,
	"description" text,
	"content" jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb NOT NULL,
	"plain_text" text DEFAULT '' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"linked_tasks_count" integer DEFAULT 0 NOT NULL,
	"last_edited_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" integer,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT 'Untitled space' NOT NULL,
	"description" text,
	"color" text DEFAULT 'violet' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"last_opened_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pages_space_idx" ON "pages" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "pages_space_updated_idx" ON "pages" USING btree ("space_id","updated_at");--> statement-breakpoint
CREATE INDEX "pages_user_idx" ON "pages" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "space_members_space_email_idx" ON "space_members" USING btree ("space_id","email");--> statement-breakpoint
CREATE INDEX "space_members_space_idx" ON "space_members" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "space_members_user_idx" ON "space_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "space_members_email_idx" ON "space_members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "spaces_user_idx" ON "spaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "spaces_user_updated_idx" ON "spaces" USING btree ("user_id","updated_at");