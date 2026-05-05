-- ==========================================
-- ABYRA STORE — Order Lifecycle System
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
