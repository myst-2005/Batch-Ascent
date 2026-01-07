-- Rename batch ID from ' N8NON2' (or similar variants) to 'N02'
-- This script updates the batches table and all dependent tables

DO $$ 
DECLARE
    old_id TEXT := ' N8NON2'; -- The likely culprit with space
    clean_id TEXT := 'N02';
BEGIN
    -- 0. Ensure target ID doesn't conflict (or handle merge if needed, but assuming rename)
    -- If 'N02' already exists, we might need a different strategy. Assuming it's a rename.
    
    -- 1. Update batches table (Master)
    -- We need to handle potential PK conflict if N02 exists. 
    -- If N02 exists, we might need to move dependent rows to it and delete old batch.
    
    IF EXISTS (SELECT 1 FROM batches WHERE id = clean_id) THEN
        RAISE NOTICE 'Target batch % already exists. Moving dependencies...', clean_id;
        
        -- Update dependencies to point to existing N02
        UPDATE sales_enrollments SET batch_id = clean_id WHERE batch_id = old_id;
        UPDATE students SET batch_id = clean_id WHERE batch_id = old_id;
        UPDATE student_batches SET batch_id = clean_id WHERE batch_id = old_id;
        UPDATE batch_history SET batch_id = clean_id WHERE batch_id = old_id;
        
        -- Delete the old batch
        DELETE FROM batches WHERE id = old_id;
        
    ELSE
        RAISE NOTICE 'Renaming batch % to %...', old_id, clean_id;
        
        -- Standard Rename: We need to defer constraints or do it in order if CASCADE isn't set.
        -- Ideally, update Master first if Cascade. If NO ACTION/RESTRICT, update Master fails.
        -- Manually create new, move deps, delete old is safer without CASCADE knowledge.
        
        -- A. Create new batch as copy of old
        INSERT INTO batches (id, name, course, strength, start_date, academic_lead, school, mode, sho_name)
        SELECT clean_id, name, course, strength, start_date, academic_lead, school, mode, sho_name
        FROM batches WHERE id = old_id;

        -- B. Move Dependencies using clean_id
        UPDATE sales_enrollments SET batch_id = clean_id WHERE batch_id = old_id;
        UPDATE students SET batch_id = clean_id WHERE batch_id = old_id;
        -- For student_batches, ensure batch_id type is text first or valid 
        UPDATE student_batches SET batch_id = clean_id WHERE batch_id = old_id;
        UPDATE batch_history SET batch_id = clean_id WHERE batch_id = old_id;

        -- C. Delete Old Batch
        DELETE FROM batches WHERE id = old_id;
    END IF;

    -- Also handle 'N8NON2' (no space) just in case
    old_id := 'N8NON2';
    IF EXISTS (SELECT 1 FROM batches WHERE id = old_id) AND old_id <> clean_id THEN
         RAISE NOTICE 'Also merging/renaming % to %...', old_id, clean_id;
         -- (Repeat logic or use a loop, but simple copy-paste for safety)
         UPDATE sales_enrollments SET batch_id = clean_id WHERE batch_id = old_id;
         UPDATE students SET batch_id = clean_id WHERE batch_id = old_id;
         UPDATE student_batches SET batch_id = clean_id WHERE batch_id = old_id;
         UPDATE batch_history SET batch_id = clean_id WHERE batch_id = old_id;
         DELETE FROM batches WHERE id = old_id;
    END IF;

END $$;
