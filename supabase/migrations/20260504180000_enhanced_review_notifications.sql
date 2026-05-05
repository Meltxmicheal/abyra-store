-- 1. Add review_pending to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_pending BOOLEAN DEFAULT FALSE;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 3. Trigger for Order Status Notifications
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

  -- Insert notification
  INSERT INTO public.notifications (user_id, order_id, message)
  VALUES (NEW.user_id, NEW.id, notification_msg);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW
  WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status)
  EXECUTE FUNCTION public.handle_order_status_notification();
