-- 1. Enable RLS (safe to run even if already enabled)
alter table schools enable row level security;

-- 2. Drop existing policies to avoid "policy already exists" errors
drop policy if exists "Allow read access for all authenticated users" on schools;
drop policy if exists "Allow all access for ADMIN" on schools;

-- 3. Create Policies
create policy "Allow read access for all authenticated users" on schools for select using (auth.role() = 'authenticated');

create policy "Allow all access for ADMIN" on schools for all using (
  exists (select 1 from users where users.id = auth.uid() and users.role = 'ADMIN')
);

-- 4. Insert default data (if not exists)
-- This assumes 'name' or 'code' has a unique constraint. 
-- If your table was created without unique constraints, this might duplicate data.
-- Since the previous script had UNIQUE on name/code, we assume that structure.
insert into schools (name, code) values
('Tech School', 'TS'),
('Marketing School', 'MS'),
('Design School', 'DS'),
('Finance School', 'FS')
on conflict (name) do nothing;
