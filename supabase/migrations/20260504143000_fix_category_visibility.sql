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
