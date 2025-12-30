-- Enable RLS on student_batches
ALTER TABLE "public"."student_batches" ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy to allow authenticated users to view and update student_batches
-- This fixes issues where updates (like called_at or onboarding_completed) don't persist
CREATE POLICY "Allow all access to student_batches for authenticated" ON "public"."student_batches"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
