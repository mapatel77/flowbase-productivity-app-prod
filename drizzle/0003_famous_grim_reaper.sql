CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT 'Untitled note' NOT NULL,
	"color" text DEFAULT 'amber' NOT NULL,
	"content" jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb NOT NULL,
	"plain_text" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_user_deleted_idx" ON "notes" USING btree ("user_id","deleted_at");