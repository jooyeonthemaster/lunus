-- Supabase에서 실행: 벡터화된 제품이 실제로 몇 개나 있는지 확인

-- 1. 브랜드별 벡터화된 제품 수
SELECT
    brand,
    COUNT(*) as vectorized_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM products
WHERE image_embedding IS NOT NULL
GROUP BY brand
ORDER BY vectorized_count DESC;

-- 2. 프리미엄 브랜드 중 벡터화 여부
SELECT
    brand,
    COUNT(*) as total_products,
    COUNT(image_embedding) as vectorized_products,
    ROUND(COUNT(image_embedding) * 100.0 / COUNT(*), 2) as vectorization_percentage
FROM products
WHERE brand IN ('알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘')
GROUP BY brand
ORDER BY vectorized_products DESC;

-- 3. 전체 통계
SELECT
    COUNT(*) as total_products,
    COUNT(image_embedding) as vectorized_products,
    COUNT(*) - COUNT(image_embedding) as not_vectorized,
    ROUND(COUNT(image_embedding) * 100.0 / COUNT(*), 2) as vectorization_rate
FROM products;
