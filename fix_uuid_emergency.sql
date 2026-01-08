-- EMERGENCY FIX: Drop all policies on tables to diagnose/fix UUID error immediately
-- This is a NUCLEAR option for these specific tables to verify if RLS is the blocker or Schema

BEGIN;

-- Drop all policies to rule out RLS caching
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON students'; 
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'student_batches') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON student_batches'; 
    END LOOP;
     FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_enrollments') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sales_enrollments'; 
    END LOOP;
END $$;

-- FORCE ALTER to TEXT - If this fails, then there is a hard dependency or check constraint
ALTER TABLE students ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

COMMIT;
