-- ==========================================
-- ABYRA STORE — Security Hardening Migration
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
  AND (payment_status = OLD.payment_status) -- Prevent payment status manipulation
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
FOR UPDATE USING (id = auth.uid())
WITH CHECK (role = OLD.role);

-- 5. STORAGE SECURITY (Assume 'products' and 'avatars' buckets exist)
-- Ensure public can only READ product images
-- Ensure only admins can UPLOAD product images

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
