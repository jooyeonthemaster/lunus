# AI 유사도 검색 단일 브랜드 문제 진단

## 문제 상황
AI 이미지 검색 시 한 브랜드의 제품만 계속 추천되는 현상:
- 처음에는 동서가구만 30개
- 이후 알로소만 30개
- 다양한 브랜드 추천이 아닌 단일 브랜드 집중 현상

## 원인 분석

### 1. 로컬 데이터 분포 (premium-brands-unified.json)
```
한샘: 529개 (23.3%)
일룸: 457개 (20.1%)
우아미: 386개 (17.0%)
인아트: 330개 (14.5%)
플랫포인트: 270개 (11.9%)
장인가구: 174개 (7.7%)
알로소: 68개 (3.0%)  ⚠️ 가장 적음
에몬스: 60개 (2.6%)  ⚠️ 가장 적음
총: 2,274개
```

**문제**: 알로소가 전체의 3%밖에 안 되는데, AI 추천에서는 100% 알로소만 나옴

### 2. 의심되는 원인

#### A. Supabase 벡터 데이터 불균형
- Supabase `products` 테이블에 실제로 벡터화(`image_embedding`)된 제품 분포가 불균형할 가능성
- 특정 브랜드만 많이 벡터화되어 있을 수 있음

**확인 필요**: 아래 SQL을 Supabase에서 실행
```sql
-- 벡터화된 제품의 브랜드별 분포
SELECT
    brand,
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM products
WHERE image_embedding IS NOT NULL
    AND brand IN ('알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘')
GROUP BY brand
ORDER BY product_count DESC;
```

#### B. 검색 threshold 문제
현재 설정: `match_threshold: 0.1` (10% 유사도)

- threshold가 너무 낮아서 낮은 유사도 제품도 포함
- 또는 threshold가 너무 높아서 특정 브랜드만 통과

#### C. 벡터 임베딩 품질 차이
- 특정 브랜드의 이미지가 CLIP 모델에 더 잘 학습되어 있을 가능성
- 가구 스타일에 따라 벡터 품질 차이 발생

#### D. 검색 이미지 문제
- 사용자가 업로드한 이미지가 특정 브랜드 스타일과 매우 유사
- 예: 알로소 스타일 이미지 → 알로소 제품만 높은 유사도

## 해결 방법

### 1단계: 진단 (지금 실행)
```bash
# 서버 재시작
npm run dev

# 테스트:
# 1. 다양한 스타일의 이미지로 검색
# 2. 서버 터미널에서 브랜드 분포 확인

# 로그 출력 예시:
🏢 브랜드 분포:
  한샘: 12개
  일룸: 8개
  우아미: 6개
  알로소: 4개  ← 다양한 브랜드가 나와야 정상
```

### 2단계: Supabase 데이터 확인
1. Supabase Dashboard → SQL Editor
2. `check-brand-distribution.sql` 실행
3. 벡터화된 제품의 실제 브랜드 분포 확인

### 3단계: 조치 방안

#### 방안 A: Supabase 데이터 재균형
만약 특정 브랜드만 많이 벡터화되어 있다면:
```bash
# 모든 프리미엄 브랜드 제품 재벡터화
node scripts/vectorize-all-premium-products.js
```

#### 방안 B: 검색 알고리즘 개선
```typescript
// route.ts에서 수정
// 1. 브랜드별 제한
const diversifiedProducts = diversifyByBrand(products, {
  maxPerBrand: 5,  // 브랜드당 최대 5개
  minBrands: 4     // 최소 4개 브랜드
});

// 2. 유사도 기반 필터링 강화
match_threshold: 0.3  // 30%로 상향 (더 엄격)
```

#### 방안 C: 하이브리드 검색
```typescript
// 벡터 검색 + 브랜드 다양성 보장
const results = await Promise.all([
  vectorSearch(embedding, { limit: 15 }),
  randomSample(premiumBrands, { perBrand: 3 })
]);
```

## 다음 단계

1. **지금 즉시**: 개발 서버 재시작 후 다양한 이미지로 테스트
2. **브랜드 분포 로그 확인**: 터미널에서 `🏢 브랜드 분포` 출력 확인
3. **Supabase 확인**: `check-brand-distribution.sql` 실행
4. **결과 분석**: 어떤 원인인지 파악 후 적절한 해결 방안 적용

## 기대 결과

**현재 (문제)**:
```
🏢 브랜드 분포:
  알로소: 30개  ❌ 단일 브랜드 독점
```

**목표 (정상)**:
```
🏢 브랜드 분포:
  한샘: 8개
  일룸: 7개
  우아미: 6개
  인아트: 5개
  플랫포인트: 2개
  장인가구: 1개
  알로소: 1개  ✅ 다양한 브랜드 분포
```
