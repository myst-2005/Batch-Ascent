-- SUPER EMERGENCY FIX
-- The error "invalid input syntax for type uuid: 'B-5678'" usually happens when checking existence against a UUID column
-- OR when inserting into a UUID column.

BEGIN;

-- 1. Alter 'students' table - batch_id MUST be text
ALTER TABLE students ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- 2. Alter 'student_batches' table - batch_id MUST be text
ALTER TABLE student_batches ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- 3. Alter 'sales_enrollments' table - batch_id MUST be text
ALTER TABLE sales_enrollments ALTER COLUMN batch_id TYPE TEXT USING batch_id::text;

-- 4. Alter 'batches' table - id (primary key) MUST be text
-- Note: Changing PK type is harder if FKs exist. We might need to drop FKs first.
-- Let's try to alter it directly first. If it fails due to FK, we'll need a bigger script.
ALTER TABLE batches ALTER COLUMN id TYPE TEXT USING id::text;

COMMIT;
