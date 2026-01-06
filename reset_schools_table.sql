-- WARNING: This will DELETE existing data in the 'schools' table and recreate it.
-- This is necessary because your current 'schools' table does not have the 'name' column.

DROP TABLE IF EXISTS schools CASCADE;

create table schools (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  code text not null unique,
  created_at timestamptz default now()
);

-- Enable RLS
alter table schools enable row level security;

-- Policies
create policy "Allow read access for all authenticated users" on schools for select using (auth.role() = 'authenticated');
create policy "Allow all access for ADMIN" on schools for all using (
  exists (select 1 from users where users.id = auth.uid() and users.role = 'ADMIN')
);

-- Insert Data
insert into schools (name, code) values
('Tech School', 'TS'),
('Marketing School', 'MS'),
('Design School', 'DS'),
('Finance School', 'FS');
