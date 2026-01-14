BEGIN;

-- 1. Create Deletion Log Table
CREATE TABLE IF NOT EXISTS deleted_students_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT, -- Can be UUID or Text depending on legacy
    record_data JSONB,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by UUID -- Can be NULL if not available, but should be filled by trigger
);

-- Enable RLS on the log table
ALTER TABLE deleted_students_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert (via trigger)
CREATE POLICY "Enable Insert Logs" ON deleted_students_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Allow Admins/CEO/Sales Head/Academic Lead to view logs
CREATE POLICY "View Logs" ON deleted_students_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'CEO', 'SALES_HEAD', 'ACADEMIC_LEAD'))
);

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION log_student_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deleted_students_log (table_name, record_id, record_data, deleted_by)
    VALUES (TG_TABLE_NAME, OLD.id::text, row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Triggers

-- sales_enrollments
DROP TRIGGER IF EXISTS trigger_log_sales_enrollments_deletion ON sales_enrollments;
CREATE TRIGGER trigger_log_sales_enrollments_deletion
BEFORE DELETE ON sales_enrollments
FOR EACH ROW EXECUTE FUNCTION log_student_deletion();

-- student_batches
DROP TRIGGER IF EXISTS trigger_log_student_batches_deletion ON student_batches;
CREATE TRIGGER trigger_log_student_batches_deletion
BEFORE DELETE ON student_batches
FOR EACH ROW EXECUTE FUNCTION log_student_deletion();

-- students
DROP TRIGGER IF EXISTS trigger_log_students_deletion ON students;
CREATE TRIGGER trigger_log_students_deletion
BEFORE DELETE ON students
FOR EACH ROW EXECUTE FUNCTION log_student_deletion();

COMMIT;
