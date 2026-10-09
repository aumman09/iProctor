ALTER TABLE "exam_slots" ADD COLUMN "screen_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exam_slots" ADD COLUMN "screen_last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exam_slots" ADD COLUMN "screen_opened_by" text;