-- =========================================================
-- ABYRA STORE - SUPABASE SECURITY HARDENING
-- FULL SECURITY PATCH
-- =========================================================

-- =========================================================
-- STEP 1
-- ENABLE RLS ON PUBLIC TABLES
-- =========================================================

ALTER TABLE public.categories
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_images
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_variants
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_logs
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.api_logs
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_logs
ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- STEP 2
-- FORCE RLS FOR EXTRA SECURITY
-- =========================================================

ALTER TABLE public.categories
FORCE ROW LEVEL SECURITY;

ALTER TABLE public.product_images
FORCE ROW LEVEL SECURITY;

ALTER TABLE public.product_variants
FORCE ROW LEVEL SECURITY;

-- =========================================================
-- STEP 3
-- REMOVE DANGEROUS POLICIES
-- =========================================================

DROP POLICY IF EXISTS admin_logs_insert
ON public.admin_logs;

DROP POLICY IF EXISTS api_logs_insert
ON public.api_logs;

DROP POLICY IF EXISTS api_logs_insert_all
ON public.api_logs;

DROP POLICY IF EXISTS auth_logs_insert
ON public.auth_logs;

-- =========================================================
-- STEP 4
-- CREATE SECURE INSERT POLICIES
-- =========================================================

CREATE POLICY admin_logs_insert_secure
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY api_logs_insert_secure
ON public.api_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY auth_logs_insert_secure
ON public.auth_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- =========================================================
-- STEP 5
-- FIX FUNCTION SEARCH PATH WARNINGS
-- =========================================================

-- =========================================================
-- is_admin
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  SELECT role = 'admin' INTO is_adm FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(is_adm, FALSE);
END;
$$;

-- =========================================================
-- get_user_role
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name text;
BEGIN
  SELECT role
  INTO role_name
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN role_name;
END;
$$;

-- =========================================================
-- handle_order_status_notification
-- =========================================================

ALTER FUNCTION public.handle_order_status_notification()
SET search_path = public;

-- =========================================================
-- is_admin_fast
-- =========================================================

ALTER FUNCTION public.is_admin_fast()
SET search_path = public;

-- =========================================================
-- validate_order_status_transition
-- =========================================================

ALTER FUNCTION public.validate_order_status_transition()
SET search_path = public;

-- =========================================================
-- validate_order_item_payment_method
-- =========================================================

ALTER FUNCTION public.validate_order_item_payment_method()
SET search_path = public;

-- =========================================================
-- STEP 6
-- SAFE PUBLIC SELECT POLICIES
-- =========================================================

DROP POLICY IF EXISTS categories_select_public
ON public.categories;

CREATE POLICY categories_select_public
ON public.categories
FOR SELECT
USING (true);

DROP POLICY IF EXISTS product_images_select_all
ON public.product_images;

CREATE POLICY product_images_select_all
ON public.product_images
FOR SELECT
USING (true);

DROP POLICY IF EXISTS product_variants_select_all
ON public.product_variants;

CREATE POLICY product_variants_select_all
ON public.product_variants
FOR SELECT
USING (true);

-- =========================================================
-- STEP 7
-- ADMIN WRITE ACCESS ONLY
-- =========================================================

DROP POLICY IF EXISTS categories_admin_manage
ON public.categories;

CREATE POLICY categories_admin_manage
ON public.categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- =========================================================
-- PRODUCT IMAGES ADMIN POLICY
-- =========================================================

DROP POLICY IF EXISTS product_images_admin_all
ON public.product_images;

CREATE POLICY product_images_admin_all
ON public.product_images
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- =========================================================
-- PRODUCT VARIANTS ADMIN POLICY
-- =========================================================

DROP POLICY IF EXISTS product_variants_admin_all
ON public.product_variants;

CREATE POLICY product_variants_admin_all
ON public.product_variants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- =========================================================
-- STEP 8
-- VERIFY RLS STATUS
-- =========================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- =========================================================
-- STEP 9
-- VERIFY POLICIES
-- =========================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public';

-- =========================================================
-- STEP 10
-- IMPORTANT NOTES
-- =========================================================

-- NEVER USE:
-- WITH CHECK (true)
-- USING (true)
-- for INSERT / UPDATE / DELETE

-- ONLY public SELECT can use:
-- USING (true)

-- =========================================================
-- STEP 11
-- OPTIONAL EXTRA SECURITY
-- =========================================================

-- Recommended manually in Supabase dashboard:

-- Authentication → Settings:
-- Enable:
-- ✓ Leaked password protection
-- ✓ CAPTCHA
-- ✓ Email OTP expiry short duration
-- ✓ Rate limits

-- =========================================================
-- STEP 12
-- AFTER RUNNING
-- =========================================================

-- 1. Run this full SQL
-- 2. Re-open Database Linter
-- 3. Confirm errors cleared
-- 4. Test:
--    - Admin login
--    - Product fetch
--    - Order creation
--    - Notifications
--    - Reviews
--    - Categories

-- =========================================================
-- END
-- =========================================================