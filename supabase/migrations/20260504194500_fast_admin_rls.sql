-- Fast, non-recursive admin check using JWT email
-- This avoids selecting from public.users entirely during RLS checks
CREATE OR REPLACE FUNCTION public.is_admin_fast()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email' = 'abyra.com@gmail.com');
END;
$$;

-- Apply fast policy to categories
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
CREATE POLICY "categories_admin_manage" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin_fast())
  WITH CHECK (public.is_admin_fast());

-- Apply to users as well to break any potential loops
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users 
  FOR ALL USING (public.is_admin_fast());
