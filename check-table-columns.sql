-- Supabase에서 실행: products 테이블의 실제 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
