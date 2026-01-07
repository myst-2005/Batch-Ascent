-- Fix for: ERROR: 42804: foreign key constraint "sales_enrollments_batch_id_fkey" cannot be implemented 
-- DETAIL: Key columns "batch_id" and "id" are of incompatible types: double precision and text.

-- Step 1: Change sales_enrollments.batch_id from double precision (numeric) to text
-- We use 'USING batch_id::text' to cast existing values if any.
ALTER TABLE sales_enrollments 
ALTER COLUMN batch_id TYPE text USING batch_id::text;

-- Step 2: Ensure the foreign key constraint exists and is correct
-- First drop it if it exists (to start clean)
ALTER TABLE sales_enrollments 
DROP CONSTRAINT IF EXISTS sales_enrollments_batch_id_fkey;

-- Then add it back referencing batches(id)
ALTER TABLE sales_enrollments
ADD CONSTRAINT sales_enrollments_batch_id_fkey
FOREIGN KEY (batch_id) REFERENCES batches(id)
ON DELETE CASCADE; -- Optional: Delete enrollment if batch is deleted
