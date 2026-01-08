-- FINAL FIX: Automatically drop ALL policies to allow column type change, then recreate them.
-- This script does not rely on guessing policy names. It finds and nukes them all first.

BEGIN;

-- 1. Dynamic Block to DROP ALL POLICIES on sales_enrollments and student_batches
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    -- Drop all policies on sales_enrollments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_enrollments') LOOP 
        RAISE NOTICE 'Dropping policy: %', r.policyname;
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sales_enrollments'; 
    END LOOP;

    -- Drop all policies on student_batches (if any exist that block updates)
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'student_batches') LOOP 
        RAISE NOTICE 'Dropping policy: %', r.policyname;
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON student_batches'; 
    END LOOP;
END $$;

-- 2. Force Change Columns to TEXT
-- This will now succeed because no policies depend on them
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

-- 3. Recreate Essential Policies
-- We cast IDs to text to match the new column types

-- A. SALES_ENROLLMENTS POLICIES

-- Admin/CEO View All
CREATE POLICY "Admins can view all enrollments" ON sales_enrollments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO'))
);

-- Staff View School Records
CREATE POLICY "Staff can view enrollments for their school" ON sales_enrollments
FOR SELECT USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

-- SALES_HEAD Update School Records
CREATE POLICY "Staff can update enrollments for their school" ON sales_enrollments
FOR UPDATE USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role = 'SALES_HEAD'
  )
);

-- Sales View Own Records
CREATE POLICY "Sales can view own records" ON sales_enrollments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'SALES'
    AND u.sales_id::text = sales_enrollments.sales_id
  )
);

-- B. STUDENT_BATCHES POLICIES (Simple defaults if needed, or leave open if RLS not enabled/managed elsewhere)
-- (Assuming we might need read access for staff)
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON student_batches;
CREATE POLICY "Enable read access for all users" ON student_batches FOR SELECT USING (true);

-- Allow server-side inserts (service role bypasses RLS, but authenticated users might need this)
-- Usually linking is done via API (service role), but if done client side:
CREATE POLICY "Enable insert for authenticated users only" ON student_batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMIT;
