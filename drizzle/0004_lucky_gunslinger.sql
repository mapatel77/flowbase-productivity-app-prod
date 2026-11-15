CREATE TABLE "whiteboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT 'Untitled whiteboard' NOT NULL,
	"color" text DEFAULT 'emerald' NOT NULL,
	"scene" jsonb DEFAULT '{"elements":[],"appState":{"viewBackgroundColor":"#fbfaf7","gridSize":20},"files":{}}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whiteboards_user_idx" ON "whiteboards" USING btree ("user_id");