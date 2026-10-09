CREATE TYPE "public"."usage_type" AS ENUM('LOGIN', 'PORTAL_VIEW', 'ROOM_OPEN', 'SEATING_VIEW', 'COURSE_COMPLETED', 'COURSE_REOPENED', 'NOTE_UPDATED', 'SETTINGS_UPDATED');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "usage_type" NOT NULL,
	"staff_id" text,
	"room_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slot_courses" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "slot_courses" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_courses" ADD COLUMN "completed_by" text;--> statement-breakpoint
CREATE INDEX "usage_events_type_created" ON "usage_events" USING btree ("type","created_at");--> statement-breakpoint
ALTER TABLE "slot_courses" ADD CONSTRAINT "slot_courses_completed_by_staff_staff_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."staff"("staff_id") ON DELETE no action ON UPDATE no action;