-- FIX: Drop ALL policies including 'Sales can view own records', alter columns, recreate policies

BEGIN;

-- 1. Drop ALL policies on sales_enrollments to be safe
DROP POLICY IF EXISTS "SHOs/Academic Leads can view enrollments for their school" ON sales_enrollments;
DROP POLICY IF EXISTS "Staff can view enrollments for their school" ON sales_enrollments;
DROP POLICY IF EXISTS "Staff can update enrollments for their school" ON sales_enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "Sales can view their own enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "Sales Head can view all enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "Sales can view own records" ON sales_enrollments; -- Dropping the specific blocker
DROP POLICY IF EXISTS "Enable read access for all users" ON sales_enrollments; -- Drop any potential default ones

-- 2. Alter batch_id and sales_id columns to TEXT
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

-- 3. Recreate the policies

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

-- Policy B: VIEW - SHOs, SSHOs, ACADEMIC_LEADS, SALES_HEAD for their school
CREATE POLICY "Staff can view enrollments for their school"
ON sales_enrollments
FOR SELECT
USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

-- Policy C: UPDATE - Only SALES_HEAD for their school
CREATE POLICY "Staff can update enrollments for their school"
ON sales_enrollments
FOR UPDATE
USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id
    AND b.school = u.school
    AND u.role = 'SALES_HEAD'
  )
);

-- Policy D: Sales Persons can see their OWN enrollments
CREATE POLICY "Sales can view own records"
ON sales_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'SALES'
    AND u.sales_id::text = sales_enrollments.sales_id
  )
);

COMMIT;
