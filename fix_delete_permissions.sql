BEGIN;

-- 1. Sales Enrollments Delete Policy (Allow Sales Head)
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delete Sales Enrollments" ON sales_enrollments;
CREATE POLICY "Delete Sales Enrollments" ON sales_enrollments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
  )
);

COMMIT;
