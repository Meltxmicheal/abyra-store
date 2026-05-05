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
