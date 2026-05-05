-- TEMPORARY: Disable RLS on categories to debug hanging issues
-- This will confirm if the issue is RLS-related or something else (like network/database locks)
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- Also disable on products and variants for testing
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
