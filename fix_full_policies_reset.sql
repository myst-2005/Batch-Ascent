-- COMPREHENSIVE POLICY RESET & SCHEMA FIX
-- This script wipes all RLS policies for key tables and recreates them from scratch.
-- It covers: batches, sales_enrollments, students, student_batches.
-- It also ensures ID columns are TEXT to prevent UUID errors.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ---------------------------------------------------------------------------
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    -- batches
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'batches') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON batches'; 
    END LOOP;
    -- sales_enrollments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_enrollments') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sales_enrollments'; 
    END LOOP;
    -- student_batches
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'student_batches') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON student_batches'; 
    END LOOP;
    -- students
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON students'; 
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. ENSURE COLUMN TYPES ARE TEXT (Fix invalid input syntax uuid)
-- ---------------------------------------------------------------------------
ALTER TABLE students ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

-- ---------------------------------------------------------------------------
-- 3. RE-ENABLE RLS
-- ---------------------------------------------------------------------------
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. CREATE NEW POLICIES
-- ---------------------------------------------------------------------------

-- === TABLE: BATCHES ===

-- SELECT: Admin/CEO (All), Staff (Own School, All Sales (to see batches to sell))
CREATE POLICY "Admins View All Batches" ON batches FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

CREATE POLICY "Staff View School Batches" ON batches FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD') AND users.school = batches.school));

CREATE POLICY "Sales View All Batches" ON batches FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SALES', 'SALES_TEAM_LEAD', 'SALES_EXECUTIVE')));

-- INSERT: Admin, CEO, and ACADEMIC_LEAD (Fixing the user's issue)
CREATE POLICY "Admins and AC Create Batches" ON batches FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'ACADEMIC_LEAD')));

-- UPDATE: Admin, CEO (All), AC (Own School)
CREATE POLICY "Admins Update Batches" ON batches FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

CREATE POLICY "AC Update Own School Batches" ON batches FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ACADEMIC_LEAD' AND users.school = batches.school))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ACADEMIC_LEAD' AND users.school = batches.school));

-- DELETE: Admin Only
CREATE POLICY "Admins Delete Batches" ON batches FOR DELETE 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));


-- === TABLE: SALES_ENROLLMENTS ===

-- SELECT: Admin/CEO (All), Staff (Own School), Sales (Own Records)
CREATE POLICY "Admins View All Enrollments" ON sales_enrollments FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

CREATE POLICY "Staff View School Enrollments" ON sales_enrollments FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM batches b JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id AND b.school = u.school 
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
));

CREATE POLICY "Sales View Own Enrollments" ON sales_enrollments FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() 
    AND u.role IN ('SALES', 'SALES_EXECUTIVE', 'SALES_TEAM_LEAD') 
    AND u.sales_id::text = sales_enrollments.sales_id
));

-- UPDATE: Only SALES_HEAD for their school
CREATE POLICY "Sales Head Update Enrollments" ON sales_enrollments FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM batches b JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id AND b.school = u.school AND u.role = 'SALES_HEAD'
));


-- === TABLE: STUDENTS & STUDENT_BATCHES ===

-- General Read Access (Simplify for dashboard visibility)
CREATE POLICY "Enable Read Access Students" ON students FOR SELECT USING (true);
CREATE POLICY "Enable Read Access Student Batches" ON student_batches FOR SELECT USING (true);

-- Insert/Update: Authenticated users (Usually API Service Role handles this, but allow Auth users just in case)
CREATE POLICY "Enable Insert Students" ON students FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable Update Students" ON students FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable Insert Student Batches" ON student_batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable Update Student Batches" ON student_batches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable Delete Student Batches" ON student_batches FOR DELETE USING (auth.role() = 'authenticated');

COMMIT;
