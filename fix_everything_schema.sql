-- MASTER FIX: Fixes students, student_batches, AND sales_enrollments
-- Drops relevant policies, changes columns to TEXT, and restores policies.

BEGIN;

-- 1. DROP POLICIES (Safety First)
-- We use a dynamic block to drop all policies on these tables to ensure no blockers exist.
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    -- sales_enrollments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_enrollments') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sales_enrollments'; 
    END LOOP;
    -- student_batches
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'student_batches') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON student_batches'; 
    END LOOP;
     -- students (Might have policies depending on batch_id)
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON students'; 
    END LOOP;
END $$;

-- 2. ALTER COLUMNS TO TEXT (The Core Fix)
-- Convert IDs to text to support custom formats like "NAZILJHIK" or "QWERTY"

-- Fix 'students' table
ALTER TABLE students ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- Fix 'student_batches' table
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

-- Fix 'sales_enrollments' table
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;


-- 3. RESTORE POLICIES
-- We re-add the necessary security rules, casting IDs to text to match the new schema.

-- A. SALES_ENROLLMENTS
CREATE POLICY "Admins can view all enrollments" ON sales_enrollments
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

CREATE POLICY "Staff can view enrollments for their school" ON sales_enrollments
FOR SELECT USING (
   EXISTS (
    SELECT 1 FROM batches b JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

CREATE POLICY "Staff can update enrollments for their school" ON sales_enrollments
FOR UPDATE USING (
   EXISTS (
    SELECT 1 FROM batches b JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id AND b.school = u.school AND u.role = 'SALES_HEAD'
  )
);

CREATE POLICY "Sales can view own records" ON sales_enrollments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'SALES' AND u.sales_id::text = sales_enrollments.sales_id)
);

-- B. STUDENTS (Simple RLS for now)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON students FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON students FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON students FOR UPDATE USING (auth.role() = 'authenticated');

-- C. STUDENT_BATCHES
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON student_batches FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON student_batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON student_batches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON student_batches FOR DELETE USING (auth.role() = 'authenticated');

COMMIT;
