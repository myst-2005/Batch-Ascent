-- Copy data from 'school' to 'name' where 'name' is empty
update schools
set name = school
where name is null or name = '';

-- Copy data from 'school_code' to 'code' where 'code' is empty
update schools
set code = school_code
where code is null or code = '';

-- Ensure permissions are set
alter table schools enable row level security;

-- Re-run policies just in case
drop policy if exists "Allow read access for all authenticated users" on schools;
drop policy if exists "Allow all access for ADMIN" on schools;

create policy "Allow read access for all authenticated users" on schools for select using (auth.role() = 'authenticated');
create policy "Allow all access for ADMIN" on schools for all using (
  exists (select 1 from users where users.id = auth.uid() and users.role = 'ADMIN')
);
