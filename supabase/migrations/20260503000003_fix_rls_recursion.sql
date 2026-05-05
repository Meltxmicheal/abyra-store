-- ============================================================
-- ABYRA STORE — Fix RLS Recursion
-- ============================================================

-- 1. RECURSION-PROOF is_admin FUNCTION
-- Switching to PL/pgSQL prevents Postgres from inlining the function,
-- which is a common cause of RLS recursion even with SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role TEXT;
BEGIN
  -- 1. Fast check via JWT email (prevents RLS recursion)
  IF (auth.jwt() ->> 'email' = 'abyra.com@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- 2. Fallback to table lookup
  SELECT role INTO _role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN (_role = 'admin');
END;
$$;

-- 2. SIMPLIFY USERS POLICIES
-- Ensure policies are clean and don't conflict.
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

-- Use the fixed is_admin() function for admin access
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (public.is_admin());

-- 3. ENSURE ADMIN ROLE FOR PRIMARY ACCOUNT
-- This ensures the specified email always has admin rights in public.users.
UPDATE public.users
SET role = 'admin', name = 'Admin ABI M'
WHERE email = 'abyra.com@gmail.com';
