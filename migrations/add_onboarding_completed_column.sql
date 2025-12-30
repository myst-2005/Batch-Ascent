-- Add onboarding_completed column to student_batches table
ALTER TABLE "public"."student_batches" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false;
