-- Fix sales_id column type in student_batches and sales_enrollments
-- It might be set to UUID, but we need TEXT to support custom Sales IDs (e.g., "QWERTY")

BEGIN;

-- 1. Fix student_batches
-- We use DO blocks to safely handle if the column doesn't exist or is already correct, 
-- but a direct ALTER with ::text is usually safe if it exists.

DO $$ 
BEGIN
    -- Check if sales_id is not text (e.g. uuid)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'student_batches' 
        AND column_name = 'sales_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
    END IF;
END $$;

-- 2. Fix sales_enrollments
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales_enrollments' 
        AND column_name = 'sales_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
    END IF;
END $$;

COMMIT;
