-- FIX: Drop policies, alter columns to TEXT, recreate policies

BEGIN;

-- 1. Drop conflicting policies that depend on batch_id
DROP POLICY IF EXISTS "SHOs/Academic Leads can view enrollments for their school" ON sales_enrollments;
DROP POLICY IF EXISTS "Staff can view enrollments for their school" ON sales_enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON sales_enrollments;
DROP POLICY IF EXISTS "Sales can view their own enrollments" ON sales_enrollments;

-- 2. Alter batch_id and sales_id columns to TEXT
-- We use DO blocks to avoid errors if they are already text, but standard ALTER is fine here usually
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

-- 3. Recreate the policies
-- We cast b.id to text to ensure comparison works if b.id is UUID and batch_id is TEXT

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

-- Policy B: SHOs, SSHOs, ACADEMIC_LEADS, SALES_HEAD (Restored as "Staff can view...")
CREATE POLICY "Staff can view enrollments for their school"
ON sales_enrollments
FOR SELECT
USING (
   EXISTS (
    SELECT 1 FROM batches b
    JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id -- Cast b.id to text for comparison
    AND b.school = u.school
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
  )
);

-- Policy C: Sales Persons can see their OWN enrollments
CREATE POLICY "Sales can view their own enrollments"
ON sales_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'SALES'
    AND u.sales_id::text = sales_enrollments.sales_id -- Cast u.sales_id to text if needed
  )
);

COMMIT;
