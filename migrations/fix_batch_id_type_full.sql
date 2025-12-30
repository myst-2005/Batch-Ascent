
-- 1. Drop existing Foreign Key constraints referencing batches.id
ALTER TABLE batch_history DROP CONSTRAINT IF EXISTS batch_history_batch_id_fkey;
ALTER TABLE student_batches DROP CONSTRAINT IF EXISTS student_batches_batch_id_fkey;
ALTER TABLE sales_enrollments DROP CONSTRAINT IF EXISTS sales_enrollments_batch_id_fkey;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_batch_id_fkey;

-- 2. Change the referring columns in child tables to TEXT
ALTER TABLE batch_history ALTER COLUMN batch_id TYPE text;
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE text;
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE text;
ALTER TABLE students ALTER COLUMN batch_id TYPE text;

-- 3. Now change the Primary Key column in the parent table to TEXT
ALTER TABLE batches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE batches ALTER COLUMN id TYPE text;

-- 4. Re-establish the Foreign Key constraints
ALTER TABLE batch_history 
ADD CONSTRAINT batch_history_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE student_batches 
ADD CONSTRAINT student_batches_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE sales_enrollments 
ADD CONSTRAINT sales_enrollments_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE students 
ADD CONSTRAINT students_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
