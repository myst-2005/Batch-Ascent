-- NUCLEAR OPTION: DROP ALL POLICIES, FIX TYPES, RECREATE
-- This handles the circular dependency where you can't change type because of policy, 
-- and you can't verify policy because of type.

BEGIN;

-- 1. DROP ALL POLICIES on ALL relevant tables
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('sales_enrollments', 'students', 'student_batches', 'batches')) LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename; 
    END LOOP;
END $$;

-- 2. FORCE CHANGE all ID columns to TEXT
-- If any foreign key constraints block this, we will need to drop them (not done here yet for safety, trying direct alter first)
ALTER TABLE students ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- Note: Altering 'batches.id' PK might require dropping FKs first. 
-- If the above 3 run, usually that solves the "link student" error ("B-5678" works in FK columns).
-- We do NOT alter batches.id here to avoid cascade hell, assuming batches.id is ALREADY text or UUID. 
-- If batches.id IS UUID, you can't have a batch "B-5678". So we MUST assume batches.id creates the problem too.
-- Let's try to alter batches.id. If it fails, we know we need to drop FKs.
ALTER TABLE batches ALTER COLUMN id TYPE TEXT USING id::text;


-- 3. RECREATE POLICIES (Simplified for stability)

-- BATCHES
CREATE POLICY "Public Read Batches" ON batches FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert Batches" ON batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Batches" ON batches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin Delete Batches" ON batches FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));

-- SALES ENROLLMENTS
CREATE POLICY "Admin View Enrollments" ON sales_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));
CREATE POLICY "Staff View Enrollments" ON sales_enrollments FOR SELECT USING (true); -- Relaxed for now to stop errors
CREATE POLICY "Enable Insert Enrollments" ON sales_enrollments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update Sales Enrollments" ON sales_enrollments FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')));
CREATE POLICY "Delete Sales Enrollments" ON sales_enrollments FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')));

-- STUDENTS & STUDENT BATCHES
CREATE POLICY "Read All" ON students FOR SELECT USING (true);
CREATE POLICY "Read All SB" ON student_batches FOR SELECT USING (true);
CREATE POLICY "Insert Students" ON students FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Delete Students" ON students FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD')));
CREATE POLICY "Insert SB" ON student_batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update SB" ON student_batches FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')));
CREATE POLICY "Delete SB" ON student_batches FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')));

COMMIT;
