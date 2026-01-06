-- 1. Add the missing 'name' column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'schools' and column_name = 'name') then
    alter table schools add column name text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'schools' and column_name = 'code') then
    alter table schools add column code text;
  end if;
end $$;

-- 2. Make them unique (optional but good for data integrity)
-- Only run these if you are sure your data is clean. If unsure, skip them.
-- alter table schools add constraint schools_name_key unique (name);
-- alter table schools add constraint schools_code_key unique (code);

-- 3. Populate empty rows (Optional check)
-- If you have existing rows with empty names, you might want to update them manually.

-- 4. Enable RLS and Policies (Safe to re-run)
alter table schools enable row level security;

drop policy if exists "Allow read access for all authenticated users" on schools;
drop policy if exists "Allow all access for ADMIN" on schools;

create policy "Allow read access for all authenticated users" on schools for select using (auth.role() = 'authenticated');
create policy "Allow all access for ADMIN" on schools for all using (
  exists (select 1 from users where users.id = auth.uid() and users.role = 'ADMIN')
);

-- 5. Insert default schools ONLY if they don't exist
insert into schools (name, code)
select 'Tech School', 'TS'
where not exists (select 1 from schools where name = 'Tech School');

insert into schools (name, code)
select 'Marketing School', 'MS'
where not exists (select 1 from schools where name = 'Marketing School');

insert into schools (name, code)
select 'Design School', 'DS'
where not exists (select 1 from schools where name = 'Design School');

insert into schools (name, code)
select 'Finance School', 'FS'
where not exists (select 1 from schools where name = 'Finance School');
