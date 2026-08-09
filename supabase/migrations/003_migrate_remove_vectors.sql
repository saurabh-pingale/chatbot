-- Migration for existing installs that used the vector-based schema

CREATE TABLE IF NOT EXISTS public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_shop_categories_shop_id ON public.shop_categories (shop_id);

ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to shop_categories" ON public.shop_categories;
CREATE POLICY "Allow public access to shop_categories"
  ON public.shop_categories
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.shop_categories TO anon, authenticated;

-- Backfill categories from legacy category text column when present
INSERT INTO public.shop_categories (shop_id, name)
SELECT DISTINCT shop_id, COALESCE(NULLIF(TRIM(category), ''), 'Other')
FROM public.shop_products
WHERE category IS NOT NULL
ON CONFLICT (shop_id, name) DO NOTHING;

INSERT INTO public.shop_categories (shop_id, name)
SELECT DISTINCT shop_id, 'Other'
FROM public.shop_products
WHERE category IS NULL OR TRIM(category) = ''
ON CONFLICT (shop_id, name) DO NOTHING;

ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL;

UPDATE public.shop_products sp
SET category_id = sc.id
FROM public.shop_categories sc
WHERE sp.shop_id = sc.shop_id
  AND sc.name = COALESCE(NULLIF(TRIM(sp.category), ''), 'Other')
  AND sp.category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_shop_products_category_id ON public.shop_products (category_id);

ALTER TABLE public.shop_products DROP COLUMN IF EXISTS category;
ALTER TABLE public.shop_products DROP COLUMN IF EXISTS vector;

DROP FUNCTION IF EXISTS public.search_shop_products(text, vector, int);
DROP FUNCTION IF EXISTS public.search_shop_products(text, double precision[], int);
