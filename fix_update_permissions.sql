-- Enable RLS for students if not already enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 1. UPDATE Policies for 'sales_enrollments' (Action execution: Verify, Call, status change)

-- Drop existing update policies
DROP POLICY IF EXISTS "Admins can update enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "Staff can update enrollments for their school" ON sales_enrollments;

-- Policy A: ADMIN and CEO can update ALL
CREATE POLICY "Admins can update enrollments"
ON sales_enrollments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);

-- Policy B: SHOs, SSHOs, ACADEMIC_LEADS, SALES_HEAD can update enrollments where batch school matches their school
CREATE POLICY "Staff can update enrollments for their school"
ON sales_enrollments
FOR UPDATE
USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

-- 2. INSERT/DELETE Policies for 'students' (Onboarding actions)

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Staff can manage students for their school" ON students;

-- Policy A: ADMIN and CEO can manage ALL
CREATE POLICY "Admins can manage students"
ON students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);

-- Policy B: Staff (SHO, SSHO, ACADEMIC_LEAD, SALES_HEAD) can manage students for their school
CREATE POLICY "Staff can manage students for their school"
ON students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = students.batch_id  -- Ensure students table has batch_id populated
    AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

-- 3. Ensure students table has batch_id column for RLS to work
-- (It usually does based on code, but verifying)
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_id TEXT;
