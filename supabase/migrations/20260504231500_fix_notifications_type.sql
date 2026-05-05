-- Fix notification trigger to include mandatory 'type' column
-- This resolves the "null value in column type violates not-null constraint" error

CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_msg TEXT;
BEGIN
  -- Determine message based on status
  CASE NEW.order_status
    WHEN 'placed' THEN notification_msg := 'Your order has been placed';
    WHEN 'in_production' THEN notification_msg := 'Your product is in production';
    WHEN 'ready' THEN notification_msg := 'Your order is ready';
    WHEN 'shipped' THEN notification_msg := 'Your order has been shipped';
    WHEN 'delivered' THEN 
      notification_msg := 'Your order has been delivered';
      -- Mark for review pending when delivered
      UPDATE public.orders SET review_pending = TRUE WHERE id = NEW.id;
    ELSE
      notification_msg := 'Your order status has been updated to ' || NEW.order_status;
  END CASE;

  -- Insert notification with 'order_update' type
  -- We use dynamic SQL or check column existence to be safe, but usually it's just 'type'
  INSERT INTO public.notifications (user_id, order_id, message, type)
  VALUES (NEW.user_id, NEW.id, notification_msg, 'order_update');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure 'type' column exists with a default to prevent future errors
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
    END IF;
END $$;
