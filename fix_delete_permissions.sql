BEGIN;

-- 1. Sales Enrollments Delete Policy
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delete Sales Enrollments" ON sales_enrollments;
CREATE POLICY "Delete Sales Enrollments" ON sales_enrollments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD',)
  )
);

-- 2. Student Batches Delete Policy (Reinforcing)
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delete SB" ON student_batches;
CREATE POLICY "Delete SB" ON student_batches FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD',)
  )
);

COMMIT;
