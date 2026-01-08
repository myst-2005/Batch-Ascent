-- FIX: Allow Academic Lead (and others) to INSERT batches
-- Also fixing UPDATE policy for them just in case.

BEGIN;

-- 1. Enable RLS on Batches (ensure it's on)
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- 2. Create INSERT Policy for Admin, CEO, and Academic Lead
-- Dropping first to prevent errors
DROP POLICY IF EXISTS "Admins and AC can create batches" ON batches;
DROP POLICY IF EXISTS "Staff can create batches" ON batches;

CREATE POLICY "Admins and AC can create batches"
ON batches
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('ADMIN', 'CEO', 'ACADEMIC_LEAD')
  )
);

-- 3. Ensure they can also Update/Delete if needed (usually only Admins delete, but AC might edit)
DROP POLICY IF EXISTS "Admins and AC can update batches" ON batches;

CREATE POLICY "Admins and AC can update batches"
ON batches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (
      users.role IN ('ADMIN', 'CEO') 
      OR (users.role = 'ACADEMIC_LEAD' AND users.school = batches.school)
    )
  )
);

COMMIT;
