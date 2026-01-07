-- Allow ACADEMIC_LEAD to delete batches for their school
-- and dependent records

-- 1. Batches Table
DROP POLICY IF EXISTS "Academic Leads can delete batches" ON batches;
CREATE POLICY "Academic Leads can delete batches"
ON batches
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ACADEMIC_LEAD'
    AND users.school = batches.school
  )
);

-- 2. Sales Enrollments (via batch link)
DROP POLICY IF EXISTS "Academic Leads can delete enrollments" ON sales_enrollments;
CREATE POLICY "Academic Leads can delete enrollments"
ON sales_enrollments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role = 'ACADEMIC_LEAD'
  )
);

-- 3. Students (via batch link)
DROP POLICY IF EXISTS "Academic Leads can delete students" ON students;
CREATE POLICY "Academic Leads can delete students"
ON students
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = students.batch_id
    AND b.school = u.school
    AND u.role = 'ACADEMIC_LEAD'
  )
);

-- 4. Student Batches
DROP POLICY IF EXISTS "Academic Leads can delete student_batches" ON student_batches;
CREATE POLICY "Academic Leads can delete student_batches"
ON student_batches
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = student_batches.batch_id
    AND b.school = u.school
    AND u.role = 'ACADEMIC_LEAD'
  )
);

-- 5. Batch History
DROP POLICY IF EXISTS "Academic Leads can delete batch_history" ON batch_history;
CREATE POLICY "Academic Leads can delete batch_history"
ON batch_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = batch_history.batch_id
    AND b.school = u.school
    AND u.role = 'ACADEMIC_LEAD'
  )
);
