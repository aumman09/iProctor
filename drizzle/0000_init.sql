CREATE TYPE "public"."exam_kind" AS ENUM('MIDTERM', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('RUNNING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."proctor_role" AS ENUM('HEAD', 'ASSISTANT');--> statement-breakpoint
CREATE TYPE "public"."seat_color" AS ENUM('pink', 'white', 'blue', 'green', 'yellow');--> statement-breakpoint
CREATE TYPE "public"."session_name" AS ENUM('morning', 'afternoon');--> statement-breakpoint
CREATE TYPE "public"."staff_type" AS ENUM('LECTURER', 'STAFF');--> statement-breakpoint
CREATE TABLE "courses" (
	"course_code" text PRIMARY KEY NOT NULL,
	"course_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_year" integer NOT NULL,
	"term" integer NOT NULL,
	"kind" "exam_kind" NOT NULL,
	"label" text NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"room_id" text NOT NULL,
	"exam_date" date NOT NULL,
	"session" "session_name" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"period_id" text,
	"status" "import_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb,
	"warnings" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "proctor_assignments" (
	"slot_id" integer NOT NULL,
	"staff_id" text NOT NULL,
	"role" "proctor_role" DEFAULT 'ASSISTANT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proctor_assignments_slot_id_staff_id_pk" PRIMARY KEY("slot_id","staff_id")
);
--> statement-breakpoint
CREATE TABLE "room_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"version" integer NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"layout" jsonb NOT NULL,
	"source_file" text,
	"source_url" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"building" text NOT NULL,
	"room_number" text NOT NULL,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_id" integer NOT NULL,
	"course_code" text NOT NULL,
	"section" text DEFAULT '1' NOT NULL,
	"seat_group" text DEFAULT '' NOT NULL,
	"seat_color" "seat_color" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"student_id_range" text,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"staff_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "staff_type" NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_slots" ADD CONSTRAINT "exam_slots_period_id_exam_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."exam_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_slots" ADD CONSTRAINT "exam_slots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proctor_assignments" ADD CONSTRAINT "proctor_assignments_slot_id_exam_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."exam_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proctor_assignments" ADD CONSTRAINT "proctor_assignments_staff_id_staff_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_layouts" ADD CONSTRAINT "room_layouts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_courses" ADD CONSTRAINT "slot_courses_slot_id_exam_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."exam_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_courses" ADD CONSTRAINT "slot_courses_course_code_courses_course_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("course_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_periods_year_term_kind" ON "exam_periods" USING btree ("academic_year","term","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_slots_room_date_session" ON "exam_slots" USING btree ("room_id","exam_date","session");--> statement-breakpoint
CREATE INDEX "exam_slots_period_date" ON "exam_slots" USING btree ("period_id","exam_date");--> statement-breakpoint
CREATE INDEX "proctor_assignments_staff" ON "proctor_assignments" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_layouts_room_version" ON "room_layouts" USING btree ("room_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "room_layouts_one_current" ON "room_layouts" USING btree ("room_id") WHERE "room_layouts"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "slot_courses_slot_course_section" ON "slot_courses" USING btree ("slot_id","course_code","section");