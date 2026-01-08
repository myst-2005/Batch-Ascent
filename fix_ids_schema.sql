-- Fix BOTH batch_id and sales_id column types in student_batches
-- We need TEXT for both to support non-UUID legacy IDs or custom formats

BEGIN;

-- 1. Fix batch_id in student_batches (Change UUID -> TEXT)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'student_batches' 
        AND column_name = 'batch_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
    END IF;
END $$;

-- 2. Fix sales_id in student_batches (Change UUID -> TEXT)
DO $$ 
BEGIN
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

-- 3. Fix sales_enrollments (Change sales_id UUID -> TEXT)
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
