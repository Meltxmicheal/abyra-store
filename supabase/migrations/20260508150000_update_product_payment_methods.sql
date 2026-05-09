-- Safely migrate payment_methods from TEXT[] to JSONB
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'payment_methods' AND data_type = 'ARRAY') THEN
    -- Create new column
    ALTER TABLE public.products ADD COLUMN payment_methods_json JSONB DEFAULT '{"cod": true, "upi": true, "cards": true, "netbanking": true, "wallets": true}'::jsonb;
    
    -- Migrate data
    UPDATE public.products SET payment_methods_json = jsonb_build_object(
      'cod', 'COD' = ANY(payment_methods),
      'upi', 'UPI' = ANY(payment_methods),
      'cards', 'Card' = ANY(payment_methods),
      'netbanking', true,
      'wallets', true
    );
    
    -- Swap columns
    ALTER TABLE public.products DROP COLUMN payment_methods;
    ALTER TABLE public.products RENAME COLUMN payment_methods_json TO payment_methods;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'payment_methods') THEN
    ALTER TABLE public.products ADD COLUMN payment_methods JSONB DEFAULT '{"cod": true, "upi": true, "cards": true, "netbanking": true, "wallets": true}'::jsonb;
  END IF;
END $$;

-- Comment for clarity
COMMENT ON COLUMN public.products.payment_methods IS 'JSON object containing boolean flags for available payment methods: cod, upi, cards, netbanking, wallets';
