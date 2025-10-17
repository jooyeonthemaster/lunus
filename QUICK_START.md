# 🚀 AI 이미지 검색 빠른 시작 가이드

## ✅ 지금까지 완료된 것:
1. ✅ Replicate API 토큰 발급 및 설정
2. ✅ npm install 완료
3. ✅ Supabase에 768차원 벡터 컬럼 생성

---

## 🎯 마지막 단계: 함수 생성 및 벡터화

### Step 1: Supabase SQL 실행 (2분)

Supabase SQL Editor(현재 열려 있는 화면)에서:

**Ctrl+A** (전체 선택) → 아래 SQL 복사 → **붙여넣기** → **Run** 버튼 클릭

```sql
CREATE OR REPLACE FUNCTION match_products_by_image(
  query_embedding vector(768),
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
LANGUAGE plpgsql STABLE
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

CREATE OR REPLACE VIEW vectorization_progress AS
SELECT
  COUNT(*) as total_products,
  COUNT(image_embedding) as vectorized_products,
  COUNT(*) - COUNT(image_embedding) as remaining_products,
  ROUND((COUNT(image_embedding)::float / NULLIF(COUNT(*), 0)::float * 100)::numeric, 2) as progress_percentage
FROM products
WHERE image_url IS NOT NULL;
```

**"Success. No rows returned"** 메시지가 나오면 성공!

---

### Step 2: 벡터화 시작 (자동)

VSCode 터미널에서:

```powershell
npm run vectorize
```

**완료!** 이제 자동으로 모든 제품 이미지를 벡터화합니다! 🎉

---

## 📊 진행 상황 확인

Supabase SQL Editor에서:

```sql
SELECT * FROM vectorization_progress;
```

---

## 🎉 완료 후

개발 서버 실행:
```powershell
npm run dev
```

http://localhost:3000 접속 → 사진 검색 기능 테스트!


