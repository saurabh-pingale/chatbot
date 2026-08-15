ALTER TABLE public.shop_products
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE public.shop_products
ADD COLUMN IF NOT EXISTS currency_code TEXT;