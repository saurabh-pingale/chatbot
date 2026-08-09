CREATE EXTENSION IF NOT EXISTS vector;
SELECT * FROM pg_extension WHERE extname = 'vector';
ALTER TABLE public.shop_products
ALTER COLUMN vector TYPE vector(384)
USING vector::vector;
create or replace function public.search_shop_products(
  p_shop_id text,
  p_query_embedding vector(384),
  p_limit int
)
returns table (
  id uuid,
  shop_id text,
  product_id text,
  title text,
  description text,
  url text,
  image_url text,
  category text,
  variant_quantity int,
  metadata jsonb,
  vector vector(384),
  created_at timestamptz,
  updated_at timestamptz,
  distance double precision
) as $$
  select sp.*, (sp.vector <=> p_query_embedding) as distance
  from public.shop_products sp
  where sp.shop_id = p_shop_id AND (sp.vector <=> p_query_embedding) < 0.5
  order by distance
  limit p_limit;
$$ language sql stable;