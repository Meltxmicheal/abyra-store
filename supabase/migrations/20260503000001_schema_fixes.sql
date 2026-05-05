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


