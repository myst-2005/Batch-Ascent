BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE student_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (optional/safety)
DROP POLICY IF EXISTS "Update Student Batches" ON student_batches;
DROP POLICY IF EXISTS "Update Students" ON students;
DROP POLICY IF EXISTS "Delete Student Batches" ON student_batches;

-- 3. Create UPDATE policy for student_batches
-- Allows verified roles to update status, email, etc.
CREATE POLICY "Update Student Batches" ON student_batches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
  )
);

-- 4. Create DELETE policy for student_batches
-- Allows verified roles to delete (remove student)
CREATE POLICY "Delete Student Batches" ON student_batches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
  )
);

-- 5. Create UPDATE policy for students
-- Allows editing student details (like email sync)
CREATE POLICY "Update Students" ON students FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD', 'SHO')
  )
);

COMMIT;
