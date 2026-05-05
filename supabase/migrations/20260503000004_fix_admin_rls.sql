-- Fix is_admin infinite recursion by changing from SQL to PL/pgSQL
-- SQL functions can be inlined by Postgres, which ignores SECURITY DEFINER
-- and executes in the calling context, triggering infinite RLS recursion.
-- PL/pgSQL prevents inlining.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  SELECT role = 'admin' INTO is_adm FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(is_adm, FALSE);
END;
$$;
