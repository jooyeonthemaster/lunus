-- ============================================
-- RPC 함수 수정: 테이블 컬럼명에 맞춤
-- ============================================
-- 실행 방법:
-- 1. Supabase Dashboard 접속 (https://ihpzkseqxtmnmbdsvdvo.supabase.co)
-- 2. 좌측 메뉴에서 "SQL Editor" 클릭
-- 3. "New Query" 클릭
-- 4. 이 파일의 전체 내용을 복사해서 붙여넣기
-- 5. "Run" 버튼 클릭
-- ============================================

-- 기존 RPC 함수 삭제
DROP FUNCTION IF EXISTS match_products_by_image(vector, float, int);

-- 수정된 RPC 함수 생성 (테이블 컬럼명에 맞춤)
CREATE OR REPLACE FUNCTION match_products_by_image(
  query_embedding vector(512),      -- 검색할 이미지의 벡터
  match_threshold float DEFAULT 0.5, -- 최소 유사도 (0~1, 높을수록 엄격)
  match_count int DEFAULT 10         -- 반환할 최대 제품 수
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
  SELECT products.id,
         products.title,
         products.brand,
         products.image_url,
         products.price,
         products.category,
         products.url,
         (1 - (products.image_embedding <=> query_embedding))::float as similarity
  FROM products
  WHERE products.image_embedding IS NOT NULL
    AND 1 - (products.image_embedding <=> query_embedding) > match_threshold
  ORDER BY products.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_products_by_image IS '이미지 벡터 기반 유사 제품 검색 함수 (수정됨)';

-- ============================================
-- 수정 완료!
-- ============================================
-- 테스트 쿼리:
-- SELECT * FROM match_products_by_image(
--   (SELECT image_embedding FROM products WHERE image_embedding IS NOT NULL LIMIT 1),
--   0.1,
--   5
-- );
-- ============================================
