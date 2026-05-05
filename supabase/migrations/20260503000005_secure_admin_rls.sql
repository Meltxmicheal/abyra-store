-- Secure public.users against unauthorized role changes
-- This prevents a user from updating their own role to 'admin' via the API

-- 1. Create a trigger function to handle role security
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If role is being changed
  IF OLD.role <> NEW.role THEN
    -- Only allow the change if the executing user is already an admin
    -- We use public.is_admin() which we previously fixed to be secure
    IF NOT public.is_admin() THEN
      -- Log the attempt (optional but good for security)
      RAISE WARNING 'Unauthorized role change attempt by user %', auth.uid();
      -- Revert the role change to the old value
      NEW.role := OLD.role;
    END IF;
  END IF;

  -- Ensure ID and Email cannot be changed via RLS updates either
  NEW.id := OLD.id;
  NEW.email := OLD.email;

  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to the users table
DROP TRIGGER IF EXISTS on_user_update ON public.users;
CREATE TRIGGER on_user_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- 3. Update the RLS update policy to be more specific (optional but clearer)
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users 
  FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. Create an audit log for admin actions (optional but recommended)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin());
