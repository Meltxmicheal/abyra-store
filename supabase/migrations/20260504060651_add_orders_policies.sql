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
