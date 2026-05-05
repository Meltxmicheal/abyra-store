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
