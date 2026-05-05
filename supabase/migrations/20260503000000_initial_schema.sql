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
