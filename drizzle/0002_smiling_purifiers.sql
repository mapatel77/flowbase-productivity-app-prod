CREATE TABLE "kanban_board_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"user_id" integer,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanban_board_members" ADD CONSTRAINT "kanban_board_members_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_board_members" ADD CONSTRAINT "kanban_board_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kanban_board_members_board_email_idx" ON "kanban_board_members" USING btree ("board_id","email");--> statement-breakpoint
CREATE INDEX "kanban_board_members_board_idx" ON "kanban_board_members" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "kanban_board_members_user_idx" ON "kanban_board_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kanban_board_members_email_idx" ON "kanban_board_members" USING btree ("email");