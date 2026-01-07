-- Enable RLS just in case it's not
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;

-- 1. DELETE Policy for sales_enrollments
DROP POLICY IF EXISTS "Admins can delete enrollments" ON sales_enrollments;

CREATE POLICY "Admins can delete enrollments"
ON sales_enrollments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);

-- 2. DELETE Policy for student_batches
DROP POLICY IF EXISTS "Admins can delete student_batches" ON student_batches;

CREATE POLICY "Admins can delete student_batches"
ON student_batches
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);

-- 3. DELETE Policy for batch_history
DROP POLICY IF EXISTS "Admins can delete batch_history" ON batch_history;

CREATE POLICY "Admins can delete batch_history"
ON batch_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);
