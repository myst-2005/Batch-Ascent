-- FIX: Allow Academic Lead (and others) to INSERT batches WIHTOUT constraint on row values initially
-- Sometimes the WITH CHECK fails if it tries to read the row it's inserting against a SELECT policy it doesn't satisfy perfectly yet

BEGIN;

-- 1. Enable RLS on Batches (ensure it's on)
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on batches
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'batches') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON batches'; 
    END LOOP;
END $$;

-- 3. Recreate ALL Batches Policies

-- SELECT (Everyone needs to see what they just inserted)
CREATE POLICY "Admins View All Batches" ON batches FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

CREATE POLICY "Staff View School Batches" ON batches FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD') AND users.school = batches.school));

CREATE POLICY "Sales View All Batches" ON batches FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('SALES', 'SALES_TEAM_LEAD', 'SALES_EXECUTIVE')));

-- INSERT (FIXED: Academic Lead can insert)
-- Important: We allow them to insert simply if they have the ROLE. 
-- We do NOT restrict based on the row content (like matching school) in the check, unless absolutely needed, to avoid complexity.
CREATE POLICY "Admins and AC Create Batches" ON batches FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'ACADEMIC_LEAD')
  )
);

-- UPDATE
CREATE POLICY "Admins Update Batches" ON batches FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO')));

CREATE POLICY "AC Update Own School Batches" ON batches FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ACADEMIC_LEAD' AND users.school = batches.school));

-- DELETE
CREATE POLICY "Admins Delete Batches" ON batches FOR DELETE 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));

COMMIT;
