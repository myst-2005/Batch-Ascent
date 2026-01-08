BEGIN;

-- 1. Sales Enrollments Update Policy
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Update Sales Enrollments" ON sales_enrollments;
CREATE POLICY "Update Sales Enrollments" ON sales_enrollments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
  )
);

-- 2. Student Batches Update & Delete Policies (from previous fix)
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Update SB" ON student_batches;
DROP POLICY IF EXISTS "Delete SB" ON student_batches;
DROP POLICY IF EXISTS "Update Student Batches" ON student_batches; -- clean up old name
DROP POLICY IF EXISTS "Delete Student Batches" ON student_batches; -- clean up old name

CREATE POLICY "Update SB" ON student_batches FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')));
CREATE POLICY "Delete SB" ON student_batches FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')));

COMMIT;
