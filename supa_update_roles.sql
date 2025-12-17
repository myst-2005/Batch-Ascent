-- 1. Update the Check Constraint for roles in the 'users' table.
-- This assumes 'role' is a TEXT column with a constraint.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('ADMIN', 'SHO', 'ACADEMIC_LEAD', 'SALES', 'PROJECT_LEAD', 'SSHO', 'SALES_HEAD', 'CEO'));

-- 2. If 'role' is actually an ENUM type (e.g., named 'app_role' or 'user_role'), run these instead:
-- ALTER TYPE app_role ADD VALUE 'PROJECT_LEAD';
-- ALTER TYPE app_role ADD VALUE 'SSHO';
-- ALTER TYPE app_role ADD VALUE 'SALES_HEAD';
-- ALTER TYPE app_role ADD VALUE 'CEO';

-- 3. Verify the change by selecting one user and trying to update (optional)
