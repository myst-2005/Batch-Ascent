
-- Add 'verified_at' timestamp column to 'student_batches' table
ALTER TABLE student_batches ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
