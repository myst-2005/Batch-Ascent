-- 1. Add requested_role column if it doesn't exist
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "requested_role" text;

-- 2. Ensure Role Constraint allows 'PENDING' and other roles
-- We drop existing check to be safe and re-add it with all roles
ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS "users_role_check";
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_check" 
CHECK (role IN ('ADMIN', 'SHO', 'ACADEMIC_LEAD', 'SALES', 'PROJECT_LEAD', 'SSHO', 'SALES_HEAD', 'CEO', 'PENDING'));

-- 3. Create Trigger Function to handle New Users from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, requested_role, school)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    'PENDING', -- Always start as PENDING
    new.raw_user_meta_data->>'requested_role',
    new.raw_user_meta_data->>'school' -- Capture School from signup
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Enable RLS on users table (just in case)
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Note: We rely on the Trigger for insertion, so no special INSERT policy is needed for the client.
-- The client only strictly needs SELECT permission for their own user to verify.
