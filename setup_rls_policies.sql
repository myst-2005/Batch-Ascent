-- Enable RLS for batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'sales_enrollments' (Source of Truth for Dashboard)
-- Enable RLS
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Admins can view all enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "SHOs/Academic Leads can view enrollments for their school" ON sales_enrollments;
DROP POLICY IF EXISTS "Sales can view their own enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "Sales Head can view all enrollments" ON sales_enrollments;

-- Policy A: ADMIN and CEO can see ALL
CREATE POLICY "Admins can view all enrollments"
ON sales_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);

-- Policy B: SHOs, SSHOs, ACADEMIC_LEADS, SALES_HEAD can see enrollments where batch school matches their school
CREATE POLICY "Staff can view enrollments for their school"
ON sales_enrollments
FOR SELECT
USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

-- Policy C: Sales Persons can see their OWN enrollments (mapped by sales_id)
CREATE POLICY "Sales can view their own enrollments"
ON sales_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'SALES'
    AND u.sales_id = sales_enrollments.sales_id
  )
);

-- 2. Policies for 'batches' (Ensure they see only their batches too)
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all batches" ON batches;
DROP POLICY IF EXISTS "Staff can see batches for their school" ON batches;
DROP POLICY IF EXISTS "Sales can see all batches" ON batches;

-- Policy A: Admin/CEO see all
CREATE POLICY "Admins can view all batches"
ON batches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO')
  )
);

-- Policy B: Staff (SHO, SSHO, ACADEMIC_LEAD, SALES_HEAD) see their school batches
CREATE POLICY "Staff can view batches for their school"
ON batches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
    AND u.school = batches.school 
  )
);

-- Sales people need to see batches to enroll students
CREATE POLICY "Sales can view all batches"
ON batches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'SALES'
  )
);
