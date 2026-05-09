-- Add trigger to validate payment methods on order items
CREATE OR REPLACE FUNCTION public.validate_order_item_payment_method()
RETURNS TRIGGER AS $$
DECLARE
  v_payment_method TEXT;
  v_product_methods JSONB;
BEGIN
  -- Get the payment method from the parent order
  SELECT payment_method INTO v_payment_method FROM public.orders WHERE id = NEW.order_id;
  
  -- Get the allowed methods for the product
  SELECT payment_methods INTO v_product_methods FROM public.products WHERE id = NEW.product_id;
  
  -- If product methods is null (should not happen with default), allow all
  IF v_product_methods IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validation logic
  -- payment_method can be 'UPI', 'Card', or 'COD'
  IF v_payment_method = 'COD' AND COALESCE((v_product_methods->>'cod')::boolean, true) = false THEN
    RAISE EXCEPTION 'Product % does not allow Cash on Delivery', NEW.product_id;
  END IF;
  
  -- For online payments, we check the specific flags
  IF v_payment_method = 'UPI' AND 
     COALESCE((v_product_methods->>'upi')::boolean, true) = false AND 
     COALESCE((v_product_methods->>'netbanking')::boolean, true) = false AND 
     COALESCE((v_product_methods->>'wallets')::boolean, true) = false THEN
    RAISE EXCEPTION 'Product % does not allow UPI/Online payments', NEW.product_id;
  END IF;

  IF v_payment_method = 'Card' AND COALESCE((v_product_methods->>'cards')::boolean, true) = false THEN
    RAISE EXCEPTION 'Product % does not allow Card payments', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_order_item_payment_method ON public.order_items;
CREATE TRIGGER trigger_validate_order_item_payment_method
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_order_item_payment_method();

-- Comment for clarity
COMMENT ON FUNCTION public.validate_order_item_payment_method() IS 'Ensures the payment method used for an order is allowed by each individual product in the order.';
