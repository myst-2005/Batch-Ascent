-- Add missing columns to sales_enrollments if they don't exist
alter table sales_enrollments add column if not exists student_name text;
alter table sales_enrollments add column if not exists contact_number text;
alter table sales_enrollments add column if not exists email text;
alter table sales_enrollments add column if not exists admission_date date;
alter table sales_enrollments add column if not exists lead_creation_date date;
alter table sales_enrollments add column if not exists lead_source text;
alter table sales_enrollments add column if not exists school text;
alter table sales_enrollments add column if not exists batch_code text;
alter table sales_enrollments add column if not exists verified_seats boolean default false;
alter table sales_enrollments add column if not exists payment_mode text;
alter table sales_enrollments add column if not exists emi_partner text;
alter table sales_enrollments add column if not exists total_sale_value numeric;
alter table sales_enrollments add column if not exists amount_paid numeric;
alter table sales_enrollments add column if not exists scholarships_notes text;
alter table sales_enrollments add column if not exists sales_executive_code text;
alter table sales_enrollments add column if not exists sales_executive_number text;
alter table sales_enrollments add column if not exists pledge_accepted boolean default false;

-- Enable RLS just in case
alter table sales_enrollments enable row level security;

-- Policy to allow Sales regarding their own inserts (if not already exists)
-- This is a bit loose, relying on authenticated users being able to insert if the policy allows. 
-- We'll add a policy for authenticated users to insert, or specifically sales roles if we can check user metadata or just role.

create policy "Enable insert for authenticated users" on sales_enrollments for insert with check (auth.role() = 'authenticated');
