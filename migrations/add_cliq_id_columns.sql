-- Add cliq_id column to batches table if it does not exist
ALTER TABLE "public"."batches" ADD COLUMN IF NOT EXISTS "cliq_id" text;

-- Add cliq_id column to users table if it does not exist (just in case)
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "cliq_id" text;
