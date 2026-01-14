BEGIN;

-- 1. Ensure students table has Delete Policy
-- We drop first to ensure no conflict
DROP POLICY IF EXISTS "Delete Students" ON students;

CREATE POLICY "Delete Students" ON students FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD')
    )
);

-- 2. Ensure sales_enrollments has Delete Policy
DROP POLICY IF EXISTS "Delete Sales Enrollments" ON sales_enrollments;

CREATE POLICY "Delete Sales Enrollments" ON sales_enrollments FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
    )
);

-- 3. Ensure student_batches has Delete Policy
DROP POLICY IF EXISTS "Delete SB" ON student_batches; 
-- Note: previous file used "Delete SB" name, checking consistency
DROP POLICY IF EXISTS "Delete Student Batches" ON student_batches;

CREATE POLICY "Delete Student Batches" ON student_batches FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
    )
);

COMMIT;
