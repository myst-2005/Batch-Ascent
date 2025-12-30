
-- Add 'school' column to 'student_batches' table
ALTER TABLE student_batches ADD COLUMN IF NOT EXISTS school TEXT;
