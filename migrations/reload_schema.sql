-- Force Supabase API (PostgREST) to reload schema cache to pick up new columns
NOTIFY pgrst, 'reload schema';
