-- ==========================================
-- UNIFIED ABYRA STORE SCHEMA
-- Auto-generated consolidation of all migrations
-- ==========================================

-- >>> START OF MIGRATION: 20260503000000_initial_schema.sql <<<
-- ============================================================
-- ABYRA STORE — Production-Ready Database Schema
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
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (public.is_admin());

-- PRODUCTS & CATEGORIES
DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL USING (public.is_admin());

-- CART
DROP POLICY IF EXISTS "cart_own" ON public.cart;
DROP POLICY IF EXISTS "cart_own" ON public.cart;
CREATE POLICY "cart_own" ON public.cart FOR ALL USING (user_id = auth.uid());

-- PASSWORD RESETS (Restrict to Service Role/Backend only)
DROP POLICY IF EXISTS "password_resets_deny_public" ON public.password_resets;
DROP POLICY IF EXISTS "password_resets_deny_public" ON public.password_resets;
CREATE POLICY "password_resets_deny_public" ON public.password_resets FOR ALL USING (FALSE);

-- 5. TRIGGER: AUTH → PUBLIC SYNC
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

-- >>> END OF MIGRATION: 20260503000000_initial_schema.sql <<<

-- >>> START OF MIGRATION: 20260503000001_schema_fixes.sql <<<
-- ============================================================
-- ABYRA STORE — Schema Fixes & Completion
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



-- >>> END OF MIGRATION: 20260503000001_schema_fixes.sql <<<

-- >>> START OF MIGRATION: 20260503000002_logging_schema.sql <<<
-- ============================================================
-- ABYRA STORE — Logging Infrastructure
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
DROP POLICY IF EXISTS "logs_insert_all" ON public.user_activity_logs;
CREATE POLICY "logs_insert_all" ON public.user_activity_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "auth_logs_insert_all" ON public.auth_logs;
DROP POLICY IF EXISTS "auth_logs_insert_all" ON public.auth_logs;
CREATE POLICY "auth_logs_insert_all" ON public.auth_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "error_logs_insert_all" ON public.error_logs;
DROP POLICY IF EXISTS "error_logs_insert_all" ON public.error_logs;
CREATE POLICY "error_logs_insert_all" ON public.error_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "admin_logs_admin_all" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_admin_all" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_all" ON public.admin_logs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "api_logs_insert_all" ON public.api_logs;
DROP POLICY IF EXISTS "api_logs_insert_all" ON public.api_logs;
CREATE POLICY "api_logs_insert_all" ON public.api_logs FOR INSERT WITH CHECK (TRUE);

-- >>> END OF MIGRATION: 20260503000002_logging_schema.sql <<<

-- >>> START OF MIGRATION: 20260503000003_fix_rls_recursion.sql <<<
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
  -- We select directly from the table. 
  -- SECURITY DEFINER ensures we bypass RLS on public.users.
  SELECT role INTO _role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN (_role = 'admin');
END;
$$;

-- 2. SIMPLIFY USERS POLICIES
-- Ensure policies are clean and don't conflict.
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

-- Use the fixed is_admin() function for admin access
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (public.is_admin());

-- 3. ENSURE ADMIN ROLE FOR PRIMARY ACCOUNT
-- This ensures the specified email always has admin rights in public.users.
UPDATE public.users
SET role = 'admin', name = 'Admin ABI M'
WHERE email = 'abyra.com@gmail.com';

-- >>> END OF MIGRATION: 20260503000003_fix_rls_recursion.sql <<<

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

-- >>> END OF MIGRATION: 20260503000004_fix_admin_rls.sql <<<

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

-- >>> END OF MIGRATION: 20260503000005_secure_admin_rls.sql <<<

-- >>> START OF MIGRATION: 20260504060651_add_orders_policies.sql <<<
-- 1. Create Policies for Orders
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE USING (user_id = auth.uid());

-- 2. Create Policies for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_insert_all" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_all" ON public.order_items;
CREATE POLICY "order_items_insert_all" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
CREATE POLICY "order_items_select_all" ON public.order_items FOR SELECT USING (true);

-- >>> END OF MIGRATION: 20260504060651_add_orders_policies.sql <<<

