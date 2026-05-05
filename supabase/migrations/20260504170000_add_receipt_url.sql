-- Add receipt_url to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;
