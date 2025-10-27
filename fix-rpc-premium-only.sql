-- RPC 함수 수정: 프리미엄 브랜드만 검색하도록
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
    -- 프리미엄 브랜드만 필터링
    AND products.brand IN ('알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘')
  ORDER BY products.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_products_by_image IS '이미지 벡터 기반 유사 제품 검색 (프리미엄 브랜드만)';
