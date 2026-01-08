-- REMOVE FK CONSTRAINTS AND FIX TYPES
-- If the error persists, it's likely a Foreign Key constraint creating a hidden dependency or preventing the type change.

BEGIN;

-- 1. Drop Policies (Again, to be safe)
DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('sales_enrollments', 'students', 'student_batches', 'batches')) LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename; 
    END LOOP;
END $$;

-- 2. DROP FOREIGN KEY CONSTRAINTS specifically for batch_id
-- We need to find their names or just drop the common ones. 
-- Since names are auto-generated sometimes, we use a dynamic block or standard guesses.
-- Standard guess: 'student_batches_batch_id_fkey', 'sales_enrollments_batch_id_fkey', 'students_batch_id_fkey'

ALTER TABLE student_batches DROP CONSTRAINT IF EXISTS student_batches_batch_id_fkey;
ALTER TABLE sales_enrollments DROP CONSTRAINT IF EXISTS sales_enrollments_batch_id_fkey;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_batch_id_fkey;

-- 3. NOW Force Change to TEXT
ALTER TABLE batches ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE students ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- 4. Re-Add Foreign Key Constraints (Optional, but good for integrity)
-- They will now link TEXT to TEXT
ALTER TABLE student_batches ADD CONSTRAINT student_batches_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id);
ALTER TABLE sales_enrollments ADD CONSTRAINT sales_enrollments_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id);
-- students table usually doesn't have FK to batch if it's many-to-many via student_batches, but if it does:
-- ALTER TABLE students ADD CONSTRAINT students_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id);

-- 5. Restore Policies (Simple)
CREATE POLICY "Public Read Batches" ON batches FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert Batches" ON batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Batches" ON batches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin Delete Batches" ON batches FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));

CREATE POLICY "Admin View Enrollments" ON sales_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));
CREATE POLICY "Staff View Enrollments" ON sales_enrollments FOR SELECT USING (true);
CREATE POLICY "Enable Insert Enrollments" ON sales_enrollments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMIT;
