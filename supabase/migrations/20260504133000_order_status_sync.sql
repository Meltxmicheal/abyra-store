-- 1. Ensure order_status is NOT a generated column
-- In Postgres 13+, we can use DROP EXPRESSION to convert it to a normal column
ALTER TABLE public.orders ALTER COLUMN order_status DROP EXPRESSION IF EXISTS;

-- 2. Update Order Status Constraint
DO $$ 
BEGIN 
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
END $$;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('pending', 'cancel_requested', 'confirmed', 'cancelled', 'production', 'ready', 'shipped', 'delivered'));

-- 3. Migrate existing statuses if any
UPDATE public.orders SET order_status = 'production' WHERE order_status = 'in_production';
UPDATE public.orders SET order_status = 'pending' WHERE order_status = 'placed';
