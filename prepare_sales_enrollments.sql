-- Upgrade sales_enrollments to support dashboard requirements

-- 1. Add missing columns
ALTER TABLE sales_enrollments
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS student_email TEXT; -- Ensure email exists (it should, but safety first)

-- 2. Populate data from student_batches (Migration)
INSERT INTO sales_enrollments (student_name, student_email, student_phone, batch_id, sales_id, linked_at, status, verified_at, called_at, onboarding_completed)
SELECT 
    student_name, 
    student_email, 
    student_phone, 
    batch_id, 
    sales_id, 
    linked_at, 
    status, 
    verified_at, 
    called_at, 
    onboarding_completed
FROM student_batches
WHERE student_email NOT IN (SELECT student_email FROM sales_enrollments);
