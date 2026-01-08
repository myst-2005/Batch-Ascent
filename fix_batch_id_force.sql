-- Force fix batch_id in student_batches to TEXT
-- Use this if you are getting "invalid input syntax for type uuid" for the BATCH ID

BEGIN;

-- 1. Alter batch_id to TEXT in student_batches
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- 2. Alter batch_id to TEXT in sales_enrollments (if applicable)
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- 3. Also fix sales_id while we are at it, just in case
ALTER TABLE student_batches ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;

COMMIT;
