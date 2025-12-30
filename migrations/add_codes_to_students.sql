-- Add school_code and course_code columns to students table
ALTER TABLE "public"."students" ADD COLUMN IF NOT EXISTS "school_code" text;
ALTER TABLE "public"."students" ADD COLUMN IF NOT EXISTS "course_code" text;


