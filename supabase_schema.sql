-- Supabase 테이블 생성 SQL (업데이트 버전)

-- 기존 테이블이 있다면 삭제 (주의!)
-- DROP TABLE IF EXISTS products;

-- products 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  imageUrl TEXT UNIQUE, -- unique constraint for upsert
  price INTEGER,
  priceText TEXT,
  category TEXT,
  brand TEXT,
  productUrl TEXT, -- 제품 상세 페이지 URL
  description TEXT, -- 제품 설명 (옵션)
  tags TEXT[], -- 태그 배열 (옵션)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- imageUrl에 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_imageUrl ON products(imageUrl);

-- category에 인덱스 생성 (카테고리별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- brand에 인덱스 생성 (브랜드별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_products_updated_at BEFORE UPDATE
    ON products FOR EACH ROW EXECUTE PROCEDURE 
    update_updated_at_column();