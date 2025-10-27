-- 슈퍼베이스에서 실행: 벡터화된 제품의 브랜드별 분포 확인
-- 이 쿼리로 특정 브랜드가 압도적으로 많은지 확인

-- 1. 전체 브랜드별 제품 수 (벡터 임베딩 있는 것만)
SELECT
    brand,
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM products
WHERE image_embedding IS NOT NULL
GROUP BY brand
ORDER BY product_count DESC;

-- 2. 프리미엄 브랜드만 필터링해서 확인
SELECT
    brand,
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM products
WHERE image_embedding IS NOT NULL
    AND brand IN ('알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘')
GROUP BY brand
ORDER BY product_count DESC;

-- 3. 알로소 제품이 얼마나 많은지 확인
SELECT
    CASE
        WHEN brand = '알로소' THEN '알로소'
        ELSE '기타 브랜드'
    END as brand_group,
    COUNT(*) as count
FROM products
WHERE image_embedding IS NOT NULL
    AND brand IN ('알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘')
GROUP BY brand_group;

-- 4. 각 프리미엄 브랜드별 샘플 제품 1개씩 확인
SELECT DISTINCT ON (brand)
    brand,
    title,
    price,
    LEFT(id, 20) as id_sample
FROM products
WHERE image_embedding IS NOT NULL
    AND brand IN ('알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘')
ORDER BY brand, title;
