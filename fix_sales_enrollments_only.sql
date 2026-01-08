-- FIX SPECIFICALLY FOR 'sales_enrollments' TABLE
-- The user reported the issue is here.
-- This script ensures batch_id and sales_id are TEXT.

BEGIN;

-- 1. Drop policies on sales_enrollments to allow schema change
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_enrollments') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sales_enrollments'; 
    END LOOP;
END $$;

-- 2. Modify Columns to TEXT
-- This allows IDs like "NAZILJHIK" or "QWERTY"
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

-- 3. Re-enable RLS with simple policies
ALTER TABLE sales_enrollments ENABLE ROW LEVEL SECURITY;

-- Allow Admin/CEO to do everything
CREATE POLICY "Admins Full Access" ON sales_enrollments 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

-- Allow Sales to View their own
CREATE POLICY "Sales View Own" ON sales_enrollments FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() 
    AND u.role IN ('SALES', 'SALES_EXECUTIVE', 'SALES_TEAM_LEAD') 
    AND u.sales_id::text = sales_enrollments.sales_id
));

-- Allow Staff to View their School
CREATE POLICY "Staff View School" ON sales_enrollments FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM batches b JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id AND b.school = u.school 
    AND u.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD')
));

-- Allow SALES_HEAD to Update their School
CREATE POLICY "Sales Head Update School" ON sales_enrollments FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM batches b JOIN users u ON u.id = auth.uid()
    WHERE b.id::text = sales_enrollments.batch_id AND b.school = u.school AND u.role = 'SALES_HEAD'
));

-- Allow Insert (Service Role / API usually handles this, but auth user permissions might be needed)
CREATE POLICY "Enable Insert" ON sales_enrollments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

COMMIT;
