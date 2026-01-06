create table schools (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  code text not null unique,
  created_at timestamptz default now()
);

-- Insert existing default schools so they appear in the list
insert into schools (name, code) values
('Tech School', 'TS'),
('Marketing School', 'MS'),
('Design School', 'DS'),
('Finance School', 'FS');

-- Enable RLS (Optional but recommended)
alter table schools enable row level security;
create policy "Allow read access for all authenticated users" on schools for select using (auth.role() = 'authenticated');
create policy "Allow all access for ADMIN" on schools for all using (
  exists (select 1 from users where users.id = auth.uid() and users.role = 'ADMIN')
);
