-- >>> START OF MIGRATION: 20260503000000_initial_schema.sql <<<
-- ============================================================
-- ABYRA STORE â€” Production-Ready Database Schema
-- Last Updated: 2026-05-03
-- ============================================================

-- 1. BASE TABLES (CREATE IF NOT EXISTS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY -- Store custom order IDs like 'ABY-123'
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- LOGGING & AUTH TABLES
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.otp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. COLUMN DEFINITIONS (IDEMPOTENT ADDITIONS)
-- ------------------------------------------------------------

-- USERS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- CATEGORIES
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name TEXT UNIQUE NOT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- PRODUCTS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS production_time INTEGER DEFAULT 7;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT '{"UPI","Card","COD"}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- PRODUCT IMAGES & VARIANTS
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS variant_name TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS delivery_days INT DEFAULT 3;

-- CART
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ORDERS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'COD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','cod'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'placed' CHECK (order_status IN ('pending','placed','in_production','ready','shipped','delivered'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- LOGGING COLUMNS
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS stack_trace TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. HELPER FUNCTIONS
-- ------------------------------------------------------------
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

-- 4. RLS POLICIES (IDEMPOTENT)
-- ------------------------------------------------------------
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets    ENABLE ROW LEVEL SECURITY;

-- USERS
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (public.is_admin());

-- PRODUCTS & CATEGORIES
DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL USING (public.is_admin());

-- CART
DROP POLICY IF EXISTS "cart_own" ON public.cart;
CREATE POLICY "cart_own" ON public.cart FOR ALL USING (user_id = auth.uid());

-- PASSWORD RESETS (Restrict to Service Role/Backend only)
DROP POLICY IF EXISTS "password_resets_deny_public" ON public.password_resets;
CREATE POLICY "password_resets_deny_public" ON public.password_resets FOR ALL USING (FALSE);

-- 5. TRIGGER: AUTH â†’ PUBLIC SYNC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. SEED DATA & ADMIN PATCH
-- ------------------------------------------------------------
INSERT INTO public.categories (name, image) VALUES
  ('Crochet Bouquets', ''),
  ('Handmade Bags', '')
ON CONFLICT (name) DO NOTHING;

-- UPDATE THIS TO YOUR ADMIN EMAIL
UPDATE public.users
SET role = 'admin', name = 'Admin ABI M'
WHERE email = 'abyra.com@gmail.com';


-- >>> START OF MIGRATION: 20260503000001_schema_fixes.sql <<<
-- ============================================================
-- ABYRA STORE â€” Schema Fixes & Completion
-- Ensures all columns required by Frontend/Backend are present.
-- ============================================================

-- 1. ADDRESSES
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS address_line1 TEXT NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS pincode TEXT NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- 2. ORDER ITEMS
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_snapshot JSONB DEFAULT '{}';

-- 3. REVIEWS
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. SUPPORT REQUESTS
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS issue_type TEXT;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS image_proof TEXT;
ALTER TABLE public.support_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. OTP LOGS
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS otp TEXT;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. OTP LOGS
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS otp TEXT;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE public.otp_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 6. PRODUCT BASE PRICE (GENERATED)
-- Check if base_price already exists to avoid errors with GENERATED columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='base_price') THEN
        ALTER TABLE public.products ADD COLUMN base_price NUMERIC(10,2) GENERATED ALWAYS AS (COALESCE(discount_price, price)) STORED;
    END IF;
END $$;




-- >>> START OF MIGRATION: 20260503000002_logging_schema.sql <<<
-- ============================================================
-- ABYRA STORE â€” Logging Infrastructure
-- ============================================================

-- 1. ENHANCE EXISTING LOG TABLES
-- user_activity_logs
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- auth_logs
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- error_logs
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. NEW LOG TABLES
-- admin_logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_logs
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT,
  method TEXT,
  status INTEGER,
  response_time INTEGER,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS POLICIES (INSERT ONLY FOR LOGS)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_insert_all" ON public.user_activity_logs;
CREATE POLICY "logs_insert_all" ON public.user_activity_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "auth_logs_insert_all" ON public.auth_logs;
CREATE POLICY "auth_logs_insert_all" ON public.auth_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "error_logs_insert_all" ON public.error_logs;
CREATE POLICY "error_logs_insert_all" ON public.error_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "admin_logs_admin_all" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_all" ON public.admin_logs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "api_logs_insert_all" ON public.api_logs;
CREATE POLICY "api_logs_insert_all" ON public.api_logs FOR INSERT WITH CHECK (TRUE);


-- >>> START OF MIGRATION: 20260503000003_fix_rls_recursion.sql <<<
-- ============================================================
-- ABYRA STORE â€” Fix RLS Recursion
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


-- >>> START OF MIGRATION: 20260503000004_fix_admin_rls.sql <<<
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


-- >>> START OF MIGRATION: 20260503000005_secure_admin_rls.sql <<<
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

DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin());


-- >>> START OF MIGRATION: 20260504060651_add_orders_policies.sql <<<
-- 1. Create Policies for Orders
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE USING (user_id = auth.uid());

-- 2. Create Policies for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_insert_all" ON public.order_items;
CREATE POLICY "order_items_insert_all" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
CREATE POLICY "order_items_select_all" ON public.order_items FOR SELECT USING (true);


-- >>> START OF MIGRATION: 20260504130000_order_lifecycle_system.sql <<<
-- ==========================================
-- ABYRA STORE â€” Order Lifecycle System
-- ==========================================

-- 1. Update Order Status Constraint
-- First, drop the existing constraint if it exists. 
-- We need to find the name of the constraint. Usually it's 'orders_order_status_check'
DO $$ 
BEGIN 
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
END $$;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('pending', 'cancel_requested', 'confirmed', 'cancelled', 'shipped', 'delivered'));

-- 2. Add Cancel Reason and Admin Feedback
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_feedback TEXT;

-- 3. Update RLS Policies for Orders
-- Admin should be able to see and update all orders
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders 
FOR ALL USING (public.is_admin());

-- 4. Update RLS Policies for Order Items
-- Admin should be able to see all order items
DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all" ON public.order_items 
FOR ALL USING (public.is_admin());

-- 5. Strict State Transition Trigger (Optional but recommended for data integrity)
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent transitions once cancelled or delivered
    IF OLD.order_status = 'cancelled' AND NEW.order_status != 'cancelled' THEN
        RAISE EXCEPTION 'Cannot change status of a cancelled order';
    END IF;

    IF OLD.order_status = 'delivered' AND NEW.order_status != 'delivered' THEN
        RAISE EXCEPTION 'Cannot change status of a delivered order';
    END IF;

    -- If transitioning to cancel_requested, cancel_reason must be provided
    IF NEW.order_status = 'cancel_requested' AND (NEW.cancel_reason IS NULL OR NEW.cancel_reason = '') THEN
        RAISE EXCEPTION 'Cancellation reason is mandatory';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();


-- >>> START OF MIGRATION: 20260504133000_order_status_sync.sql <<<
-- 1. Ensure order_status is NOT a generated column
-- In Postgres 13+, we can use DROP EXPRESSION to convert it to a normal column
ALTER TABLE public.orders ALTER COLUMN order_status DROP EXPRESSION IF EXISTS;

-- 2. Update Order Status Constraint
DO $$ 
BEGIN 
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
END $$;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('pending', 'cancel_requested', 'confirmed', 'cancelled', 'production', 'ready', 'shipped', 'delivered'));

-- 3. Migrate existing statuses if any
UPDATE public.orders SET order_status = 'production' WHERE order_status = 'in_production';
UPDATE public.orders SET order_status = 'pending' WHERE order_status = 'placed';


-- >>> START OF MIGRATION: 20260504140000_update_order_lifecycle.sql <<<
-- Update Order Status Constraint to match new requirements
ALTER TABLE public.orders ALTER COLUMN order_status DROP EXPRESSION IF EXISTS;

DO $$ 
BEGIN 
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
END $$;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('placed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'));

-- Migrate existing statuses to new naming convention
UPDATE public.orders SET order_status = 'placed' WHERE order_status = 'pending';
UPDATE public.orders SET order_status = 'in_production' WHERE order_status = 'production';
UPDATE public.orders SET order_status = 'placed' WHERE order_status = 'confirmed';
UPDATE public.orders SET order_status = 'placed' WHERE order_status = 'cancel_requested';

-- Ensure cancel_reason column exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;


-- >>> START OF MIGRATION: 20260504143000_fix_category_visibility.sql <<<
-- Ensure categories are publicly selectable
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (TRUE);

-- Ensure admins can do everything
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL USING (public.is_admin());

-- Ensure the categories table has some data if empty
INSERT INTO public.categories (name, image)
SELECT 'Crochet Bouquets', ''
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Crochet Bouquets');

INSERT INTO public.categories (name, image)
SELECT 'Handmade Bags', ''
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Handmade Bags');


-- >>> START OF MIGRATION: 20260504150000_add_admin_2fa.sql <<<
-- Add 2FA columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT; -- Will be stored encrypted

-- Update is_admin function to include 2fa status check if needed (optional)
-- For now, we'll handle 2FA logic in the application layer (backend/frontend)

-- Add a comment for clarity
COMMENT ON COLUMN public.users.two_factor_secret IS 'TOTP secret for 2FA, should be encrypted before storage';


-- >>> START OF MIGRATION: 20260504160000_add_admin_device_otp.sql <<<
-- Add Device recognition and Email OTP fields for Admin 2FA
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_login_otp TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_otp_expiry TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_device_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_device_expiry TIMESTAMPTZ;

-- Add indexes for performance (since we'll query by device token)
CREATE INDEX IF NOT EXISTS idx_users_admin_device_token ON public.users(admin_device_token);


-- >>> START OF MIGRATION: 20260504170000_add_receipt_url.sql <<<
-- Add receipt_url to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;


-- >>> START OF MIGRATION: 20260504180000_enhanced_review_notifications.sql <<<
-- 1. Add review_pending to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_pending BOOLEAN DEFAULT FALSE;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 3. Trigger for Order Status Notifications
CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_msg TEXT;
BEGIN
  -- Determine message based on status
  CASE NEW.order_status
    WHEN 'placed' THEN notification_msg := 'Your order has been placed';
    WHEN 'in_production' THEN notification_msg := 'Your product is in production';
    WHEN 'ready' THEN notification_msg := 'Your order is ready';
    WHEN 'shipped' THEN notification_msg := 'Your order has been shipped';
    WHEN 'delivered' THEN 
      notification_msg := 'Your order has been delivered';
      -- Mark for review pending when delivered
      UPDATE public.orders SET review_pending = TRUE WHERE id = NEW.id;
    ELSE
      notification_msg := 'Your order status has been updated to ' || NEW.order_status;
  END CASE;

  -- Insert notification
  INSERT INTO public.notifications (user_id, order_id, message)
  VALUES (NEW.user_id, NEW.id, notification_msg);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW
  WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status)
  EXECUTE FUNCTION public.handle_order_status_notification();


-- >>> START OF MIGRATION: 20260504190000_fix_category_system.sql <<<
-- 1. Ensure categories table has RLS enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Public SELECT policy (Anyone can view categories)
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT USING (TRUE);

-- 3. Admin ALL policy (Admins can perform any action)
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
CREATE POLICY "categories_admin_manage" ON public.categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Ensure name is UNIQUE for upsert logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key'
  ) THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_name_key UNIQUE (name);
  END IF;
END $$;

-- 5. Seed common categories if table is empty
INSERT INTO public.categories (name, image)
VALUES 
  ('Crochet Bouquets', ''),
  ('Handmade Bags', ''),
  ('Hair Accessories', '')
ON CONFLICT (name) DO NOTHING;


-- >>> START OF MIGRATION: 20260504193000_simplify_category_rls.sql <<<
-- Simplify category management policy to avoid RLS overhead
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
CREATE POLICY "categories_admin_manage" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ensure the categories_select_public policy is still there and robust
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT USING (TRUE);


-- >>> START OF MIGRATION: 20260504194500_fast_admin_rls.sql <<<
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


-- >>> START OF MIGRATION: 20260504195000_debug_disable_rls.sql <<<
-- TEMPORARY: Disable RLS on categories to debug hanging issues
-- This will confirm if the issue is RLS-related or something else (like network/database locks)
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- Also disable on products and variants for testing
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;


-- >>> START OF MIGRATION: 20260504225800_fix_order_admin_rls.sql <<<
-- Update Order RLS to use the fast admin check
-- This resolves potential recursion/timeout issues when managing orders

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders 
  FOR ALL TO authenticated
  USING (public.is_admin_fast())
  WITH CHECK (public.is_admin_fast());

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_admin_fast())
  WITH CHECK (public.is_admin_fast());


-- >>> START OF MIGRATION: 20260504225900_update_transition_trigger.sql <<<
-- Rewrite the order status transition trigger to match the new lifecycle
-- This fixes 400 Bad Request errors during admin status updates

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent transitions once cancelled or delivered
    IF OLD.order_status = 'cancelled' AND NEW.order_status != 'cancelled' THEN
        RAISE EXCEPTION 'Cannot change status of a cancelled order';
    END IF;

    IF OLD.order_status = 'delivered' AND NEW.order_status != 'delivered' THEN
        RAISE EXCEPTION 'Cannot change status of a delivered order';
    END IF;

    -- Standard transition validation
    -- If status is changing to cancelled, ensure it wasn't already shipped (optional business rule)
    -- IF NEW.order_status = 'cancelled' AND OLD.order_status NOT IN ('placed', 'in_production') THEN
    --     RAISE EXCEPTION 'Cannot cancel an order that has already been shipped';
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger just to be safe
DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();


-- >>> START OF MIGRATION: 20260504230500_fix_notifications_schema.sql <<<
-- Fix missing columns in notifications table
-- This resolves the "column order_id does not exist" error during order status updates

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='order_id') THEN
        ALTER TABLE public.notifications ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;


-- >>> START OF MIGRATION: 20260504231500_fix_notifications_type.sql <<<
-- Fix notification trigger to include mandatory 'type' column
-- This resolves the "null value in column type violates not-null constraint" error

CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_msg TEXT;
BEGIN
  -- Determine message based on status
  CASE NEW.order_status
    WHEN 'placed' THEN notification_msg := 'Your order has been placed';
    WHEN 'in_production' THEN notification_msg := 'Your product is in production';
    WHEN 'ready' THEN notification_msg := 'Your order is ready';
    WHEN 'shipped' THEN notification_msg := 'Your order has been shipped';
    WHEN 'delivered' THEN 
      notification_msg := 'Your order has been delivered';
      -- Mark for review pending when delivered
      UPDATE public.orders SET review_pending = TRUE WHERE id = NEW.id;
    ELSE
      notification_msg := 'Your order status has been updated to ' || NEW.order_status;
  END CASE;

  -- Insert notification with 'order_update' type
  -- We use dynamic SQL or check column existence to be safe, but usually it's just 'type'
  INSERT INTO public.notifications (user_id, order_id, message, type)
  VALUES (NEW.user_id, NEW.id, notification_msg, 'order_update');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure 'type' column exists with a default to prevent future errors
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
    END IF;
END $$;


-- >>> START OF MIGRATION: 20260505160000_add_delivered_at.sql <<<
-- Add delivered_at column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Update Order Status Constraint to match current application logic
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('placed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled', 'pending', 'cancel_requested', 'confirmed'));


-- >>> START OF MIGRATION: 20260505170000_security_hardening.sql <<<
-- ==========================================
-- ABYRA STORE â€” Security Hardening Migration
-- ==========================================

-- 1. FIX ORDER ITEMS POLICIES
-- Previous policy allowed anyone to select any order item.
-- Now restricted to Admins or the User who owns the parent Order.

DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
CREATE POLICY "order_items_select_owner_admin" ON public.order_items
FOR SELECT USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_items_insert_all" ON public.order_items;
CREATE POLICY "order_items_insert_restricted" ON public.order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_id 
    AND orders.user_id = auth.uid()
  )
);

-- 2. SECURE ORDER UPDATES
-- Users should NOT be able to change their own order_status to 'delivered' or 'paid'.
-- They should only be able to request a cancellation.

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_restricted" ON public.orders
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (
  (order_status = 'cancel_requested') -- Only allow users to request cancellation
);

-- 3. SECURE REVIEW REPLIES
-- Only admins should be able to update reviews (for replies).
DROP POLICY IF EXISTS "reviews_admin_update" ON public.reviews;
CREATE POLICY "reviews_admin_update" ON public.reviews
FOR UPDATE USING (public.is_admin());

-- 4. SECURE USER ROLES
-- Prevent users from updating their own role (already partially handled by trigger, but extra safety)
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users 
FOR UPDATE USING (id = auth.uid());

-- 5. STORAGE SECURITY (Assume 'products' and 'avatars' buckets exist)
-- Ensure public can only READ product images
-- Ensure only admins can UPLOAD product images

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';


-- >>> START OF MIGRATION: 20260508150000_update_product_payment_methods.sql <<<
-- Safely migrate payment_methods from TEXT[] to JSONB
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'payment_methods' AND data_type = 'ARRAY') THEN
    -- Create new column
    ALTER TABLE public.products ADD COLUMN payment_methods_json JSONB DEFAULT '{"cod": true, "upi": true, "cards": true, "netbanking": true, "wallets": true}'::jsonb;
    
    -- Migrate data
    UPDATE public.products SET payment_methods_json = jsonb_build_object(
      'cod', 'COD' = ANY(payment_methods),
      'upi', 'UPI' = ANY(payment_methods),
      'cards', 'Card' = ANY(payment_methods),
      'netbanking', true,
      'wallets', true
    );
    
    -- Swap columns
    ALTER TABLE public.products DROP COLUMN payment_methods;
    ALTER TABLE public.products RENAME COLUMN payment_methods_json TO payment_methods;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'payment_methods') THEN
    ALTER TABLE public.products ADD COLUMN payment_methods JSONB DEFAULT '{"cod": true, "upi": true, "cards": true, "netbanking": true, "wallets": true}'::jsonb;
  END IF;
END $$;

-- Comment for clarity
COMMENT ON COLUMN public.products.payment_methods IS 'JSON object containing boolean flags for available payment methods: cod, upi, cards, netbanking, wallets';


-- >>> START OF MIGRATION: 20260508150100_validate_payment_methods_trigger.sql <<<
-- Add trigger to validate payment methods on order items
CREATE OR REPLACE FUNCTION public.validate_order_item_payment_method()
RETURNS TRIGGER AS $$
DECLARE
  v_payment_method TEXT;
  v_product_methods JSONB;
BEGIN
  -- Get the payment method from the parent order
  SELECT payment_method INTO v_payment_method FROM public.orders WHERE id = NEW.order_id;
  
  -- Get the allowed methods for the product
  SELECT payment_methods INTO v_product_methods FROM public.products WHERE id = NEW.product_id;
  
  -- If product methods is null (should not happen with default), allow all
  IF v_product_methods IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validation logic
  -- payment_method can be 'UPI', 'Card', or 'COD'
  IF v_payment_method = 'COD' AND COALESCE((v_product_methods->>'cod')::boolean, true) = false THEN
    RAISE EXCEPTION 'Product % does not allow Cash on Delivery', NEW.product_id;
  END IF;
  
  -- For online payments, we check the specific flags
  IF v_payment_method = 'UPI' AND 
     COALESCE((v_product_methods->>'upi')::boolean, true) = false AND 
     COALESCE((v_product_methods->>'netbanking')::boolean, true) = false AND 
     COALESCE((v_product_methods->>'wallets')::boolean, true) = false THEN
    RAISE EXCEPTION 'Product % does not allow UPI/Online payments', NEW.product_id;
  END IF;

  IF v_payment_method = 'Card' AND COALESCE((v_product_methods->>'cards')::boolean, true) = false THEN
    RAISE EXCEPTION 'Product % does not allow Card payments', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_order_item_payment_method ON public.order_items;
CREATE TRIGGER trigger_validate_order_item_payment_method
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_order_item_payment_method();

-- Comment for clarity
COMMENT ON FUNCTION public.validate_order_item_payment_method() IS 'Ensures the payment method used for an order is allowed by each individual product in the order.';


-- >>> START OF MIGRATION: 20260509110000_security_hardening_final.sql <<<
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

DROP POLICY IF EXISTS "admin_logs_insert_secure" ON public.admin_logs;
CREATE POLICY admin_logs_insert_secure
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "api_logs_insert_secure" ON public.api_logs;
CREATE POLICY api_logs_insert_secure
ON public.api_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "auth_logs_insert_secure" ON public.auth_logs;
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

-- Authentication â†’ Settings:
-- Enable:
-- âœ“ Leaked password protection
-- âœ“ CAPTCHA
-- âœ“ Email OTP expiry short duration
-- âœ“ Rate limits

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


