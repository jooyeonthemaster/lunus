-- ============================================
-- LUNUS 프로젝트: 이미지 벡터 검색 마이그레이션
-- ============================================
-- 이 파일은 Supabase SQL Editor에서 실행하세요
-- 실행 방법:
-- 1. Supabase Dashboard 접속
-- 2. 좌측 메뉴에서 "SQL Editor" 클릭
-- 3. "New Query" 클릭
-- 4. 이 파일의 전체 내용을 복사해서 붙여넣기
-- 5. "Run" 버튼 클릭
-- ============================================

-- Step 1: pgvector 확장 활성화
-- 벡터 데이터를 저장하고 검색하기 위한 PostgreSQL 확장
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

COMMENT ON EXTENSION vector IS 'CLIP 이미지 임베딩 벡터 저장 및 검색용';

-- Step 2: products 테이블에 이미지 임베딩 컬럼 추가
-- vector(512): CLIP ViT-B/32 모델의 512차원 벡터
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_embedding vector(512);

COMMENT ON COLUMN products.image_embedding IS 'CLIP 모델로 생성된 이미지 임베딩 벡터 (512차원)';

-- Step 3: 벡터 검색 성능 향상을 위한 인덱스 생성
-- IVFFlat: Inverted File with Flat quantization
-- vector_cosine_ops: 코사인 유사도 기반 검색
-- lists = 100: 10,000개 이하 제품에 최적화된 값
CREATE INDEX IF NOT EXISTS products_embedding_idx 
ON products 
USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON INDEX products_embedding_idx IS '이미지 벡터 검색 성능 최적화 인덱스';

-- Step 4: 유사 이미지 검색 함수 생성
-- 이 함수는 API에서 호출되어 유사한 제품을 찾습니다
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
  SELECT
    products.id,
    products.title,
    products.brand,
    products.image_url,
    products.price,
    products.category,
    products.url,
    -- 코사인 유사도 계산 (1 - 코사인 거리)
    -- 결과는 0~1 사이 값 (1에 가까울수록 유사)
    1 - (products.image_embedding <=> query_embedding) as similarity
  FROM products
  WHERE 
    -- 벡터가 존재하는 제품만
    products.image_embedding IS NOT NULL
    -- 유사도가 임계값 이상인 것만
    AND 1 - (products.image_embedding <=> query_embedding) > match_threshold
  -- 유사도 높은 순으로 정렬
  ORDER BY products.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_products_by_image IS '이미지 벡터 기반 유사 제품 검색 함수';

-- Step 5: 벡터화 진행 상황 추적을 위한 뷰 생성 (선택적)
CREATE OR REPLACE VIEW vectorization_progress AS
SELECT
  COUNT(*) as total_products,
  COUNT(image_embedding) as vectorized_products,
  COUNT(*) - COUNT(image_embedding) as remaining_products,
  ROUND(
    (COUNT(image_embedding)::float / NULLIF(COUNT(*), 0)::float * 100)::numeric, 
    2
  ) as progress_percentage
FROM products
WHERE image_url IS NOT NULL;

COMMENT ON VIEW vectorization_progress IS '벡터화 진행 상황을 확인하는 뷰';

-- ============================================
-- 마이그레이션 완료!
-- ============================================
-- 진행 상황 확인:
-- SELECT * FROM vectorization_progress;
--
-- 벡터화된 제품 수 확인:
-- SELECT COUNT(*) FROM products WHERE image_embedding IS NOT NULL;
--
-- 테스트 쿼리 (벡터화 완료 후):
-- SELECT * FROM match_products_by_image(
--   (SELECT image_embedding FROM products WHERE id = 1),
--   0.5,
--   10
-- );
-- ============================================

