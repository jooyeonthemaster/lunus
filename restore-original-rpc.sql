-- 원래 RPC 함수로 복구
DROP FUNCTION IF EXISTS match_products_by_image(vector, float, int);

CREATE OR REPLACE FUNCTION match_products_by_image(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  title text,
  brand text,
  image_url text,
  price integer,
  category text,
  url text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    products.id,
    products.title,
    products.brand,
    products.image_url,
    products.price,
    products.category,
    products.url,
    1 - (products.image_embedding <=> query_embedding) as similarity
  FROM products
  WHERE
    products.image_embedding IS NOT NULL
    AND 1 - (products.image_embedding <=> query_embedding) > match_threshold
  ORDER BY products.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
