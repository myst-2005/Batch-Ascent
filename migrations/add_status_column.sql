
-- Add 'status' column to 'student_batches' table
ALTER TABLE student_batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- Update existing records to have 'Pending' status if null
UPDATE student_batches SET status = 'Pending' WHERE status IS NULL;
