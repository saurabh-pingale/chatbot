-- FAQ entries per Shopify shop for the chatbot
CREATE TABLE IF NOT EXISTS public.shop_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_faqs_shop_id ON public.shop_faqs (shop_id);

ALTER TABLE public.shop_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to shop_faqs" ON public.shop_faqs;
CREATE POLICY "Allow public access to shop_faqs"
  ON public.shop_faqs
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.shop_faqs TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_shop_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_faqs_updated_at ON public.shop_faqs;
CREATE TRIGGER shop_faqs_updated_at
  BEFORE UPDATE ON public.shop_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shop_faqs_updated_at();
