-- Fix for: ERROR: 42804: foreign key constraint "student_batches_batch_id_fkey" cannot be implemented 
-- DETAIL: Key columns "batch_id" and "id" are of incompatible types: character varying and text.
-- (Wait, character varying IS text, so maybe the error actually said double precision vs text?)
-- Assuming the user meant double precision -> text fix for 'student_batches'.

-- Step 1: Change student_batches.batch_id to TEXT (just to be safe and match parent)
ALTER TABLE student_batches 
ALTER COLUMN batch_id TYPE text USING batch_id::text;

-- Step 2: Ensure the foreign key constraint exists and is correct
ALTER TABLE student_batches 
DROP CONSTRAINT IF EXISTS student_batches_batch_id_fkey;

ALTER TABLE student_batches
ADD CONSTRAINT student_batches_batch_id_fkey
FOREIGN KEY (batch_id) REFERENCES batches(id)
ON DELETE CASCADE;

-- Also verify verification_status check constraint exists as user showed
ALTER TABLE student_batches
DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE student_batches
ADD CONSTRAINT check_verification_status 
CHECK (verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'Verified'::text, 'Pending'::text]));
