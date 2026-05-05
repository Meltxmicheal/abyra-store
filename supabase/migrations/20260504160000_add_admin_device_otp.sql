-- Add Device recognition and Email OTP fields for Admin 2FA
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_login_otp TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_otp_expiry TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_device_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_device_expiry TIMESTAMPTZ;

-- Add indexes for performance (since we'll query by device token)
CREATE INDEX IF NOT EXISTS idx_users_admin_device_token ON public.users(admin_device_token);
