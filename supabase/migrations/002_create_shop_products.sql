-- Create categories table
CREATE TABLE IF NOT EXISTS public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_shop_categories_shop_id
  ON public.shop_categories (shop_id);


-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  category_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,
  variant_quantity INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Add category_id if shop_products already existed
ALTER TABLE public.shop_products
ADD COLUMN IF NOT EXISTS category_id UUID;


-- Add foreign key if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_products_category_id_fkey'
  ) THEN
    ALTER TABLE public.shop_products
    ADD CONSTRAINT shop_products_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES public.shop_categories(id)
    ON DELETE SET NULL;
  END IF;
END $$;


-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_products_shop_product
  ON public.shop_products (shop_id, product_id);

CREATE INDEX IF NOT EXISTS idx_shop_products_shop_id
  ON public.shop_products (shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_products_category_id
  ON public.shop_products (category_id);


-- RLS
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Allow public access to shop_categories"
  ON public.shop_categories;

CREATE POLICY "Allow public access to shop_categories"
  ON public.shop_categories
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


DROP POLICY IF EXISTS "Allow public access to shop_products"
  ON public.shop_products;

CREATE POLICY "Allow public access to shop_products"
  ON public.shop_products
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


GRANT ALL ON public.shop_categories TO anon, authenticated;
GRANT ALL ON public.shop_products TO anon, authenticated;


-- Updated-at triggers
CREATE OR REPLACE FUNCTION public.set_shop_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_categories_updated_at
  ON public.shop_categories;

CREATE TRIGGER shop_categories_updated_at
  BEFORE UPDATE ON public.shop_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shop_categories_updated_at();


CREATE OR REPLACE FUNCTION public.set_shop_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_products_updated_at
  ON public.shop_products;

CREATE TRIGGER shop_products_updated_at
  BEFORE UPDATE ON public.shop_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shop_products_updated_at();