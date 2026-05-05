-- Add 2FA columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT; -- Will be stored encrypted

-- Update is_admin function to include 2fa status check if needed (optional)
-- For now, we'll handle 2FA logic in the application layer (backend/frontend)

-- Add a comment for clarity
COMMENT ON COLUMN public.users.two_factor_secret IS 'TOTP secret for 2FA, should be encrypted before storage';
