ALTER TABLE sales_enrollments DROP CONSTRAINT IF EXISTS sales_enrollments_sales_id_fkey;

-- 2. Add enrolled_at if missing
ALTER TABLE sales_enrollments ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure columns are TEXT
ALTER TABLE sales_enrollments ALTER COLUMN sales_id TYPE TEXT USING sales_id::text;
