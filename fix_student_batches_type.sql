-- Fix student_batches schema to allow TEXT batch_ids
-- This prevents "invalid input syntax for type uuid" when using non-UUID batch IDs

DO $$ 
BEGIN
    -- Check if column exists and is UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'student_batches' 
        AND column_name = 'batch_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Change to TEXT
        ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
    END IF;
END $$;
