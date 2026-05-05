-- Update Order Status Constraint to match new requirements
ALTER TABLE public.orders ALTER COLUMN order_status DROP EXPRESSION IF EXISTS;

DO $$ 
BEGIN 
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
END $$;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('placed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'));

-- Migrate existing statuses to new naming convention
UPDATE public.orders SET order_status = 'placed' WHERE order_status = 'pending';
UPDATE public.orders SET order_status = 'in_production' WHERE order_status = 'production';
UPDATE public.orders SET order_status = 'placed' WHERE order_status = 'confirmed';
UPDATE public.orders SET order_status = 'placed' WHERE order_status = 'cancel_requested';

-- Ensure cancel_reason column exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
