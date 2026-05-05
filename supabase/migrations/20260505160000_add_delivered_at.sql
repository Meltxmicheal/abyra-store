-- Add delivered_at column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Update Order Status Constraint to match current application logic
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_status_check 
CHECK (order_status IN ('placed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled', 'pending', 'cancel_requested', 'confirmed'));
