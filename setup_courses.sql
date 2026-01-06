-- 1. Create Courses Table
create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  code text not null unique,
  school_name text not null,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table courses enable row level security;

-- 3. Policies
drop policy if exists "Read access" on courses;
drop policy if exists "Admin/Lead access" on courses;

create policy "Read access" on courses for select using (auth.role() = 'authenticated');
create policy "Admin/Lead access" on courses for all using (
  exists (select 1 from users where users.id = auth.uid() and users.role in ('ADMIN', 'ACADEMIC_LEAD'))
);

-- 4. Seed Data (Upsert to avoid duplicates)
insert into courses (name, code, school_name) values
-- Tech School
('Applied AI', 'AA', 'Tech School'),
('N8N', 'NN', 'Tech School'),
('Data Analytics', 'DA', 'Tech School'),
('Python', 'PY', 'Tech School'),
-- Coding School (New)
('Flutter full stack', 'FL', 'Coding School'),
-- Design School
('CDC', 'CD', 'Design School'),
('Graphic Design', 'GD', 'Design School'),
('Branding', 'BR', 'Design School'),
('UI/UX', 'UX', 'Design School'),
('Video Editing', 'VE', 'Design School'),
-- Marketing School
('AI Integrated Basic to Advanced Digital Marketing', 'DM', 'Marketing School'),
('Performance Marketing Mastery', 'PM', 'Marketing School'),
('Social Media Mastery', 'SM', 'Marketing School'),
-- Finance School
('Advanced Practical Accounting and Financial Intelligence', 'AF', 'Finance School'),
('Advanced Taxation Course', 'TX', 'Finance School'),
('HACA Scale Up', 'SU', 'Finance School'),
('Tax Practitioner Bootcamp', 'TB', 'Finance School')
on conflict (name) do nothing;
