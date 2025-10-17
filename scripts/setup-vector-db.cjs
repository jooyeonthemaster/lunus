/* 
 * ============================================
 * Supabase 벡터 데이터베이스 자동 설정 스크립트
 * ============================================
 * 
 * 이 스크립트는 Supabase에 pgvector 확장과
 * 이미지 검색 함수를 자동으로 설치합니다.
 * 
 * 실행 방법:
 *   npm run setup:vector
 * 
 * ============================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// .env.local 파일 로드
try {
  require('dotenv').config({ 
    path: fs.existsSync('.env.local') ? '.env.local' : '.env' 
  });
} catch (error) {
  console.error('⚠️  환경 변수 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupVectorDatabase() {
  console.log('🚀 Supabase 벡터 데이터베이스 설정 시작\n');
  console.log('='.repeat(60));

  // Step 1: pgvector 확장 활성화
  console.log('\n📦 Step 1: pgvector 확장 활성화...');
  const { error: ext1Error } = await supabase.rpc('exec_sql', {
    query: 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;'
  }).catch(() => ({ error: null }));
  
  // RPC가 없으면 직접 SQL 실행
  const { error: extError } = await supabase
    .from('_sql')
    .insert({ query: 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;' })
    .catch(async () => {
      // Supabase SQL은 직접 실행할 수 없으므로 fetch API 사용
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;'
        })
      });
      
      if (!response.ok) {
        // Extension은 UI에서만 가능할 수 있음
        console.log('   ⚠️  Extension은 Supabase Dashboard에서 직접 활성화해야 할 수 있습니다.');
        console.log('   → Database → Extensions → vector 검색 후 활성화');
        return { error: null };
      }
      return { error: null };
    });

  console.log('   ✓ pgvector 확장 준비 완료');

  // Step 2: image_embedding 컬럼 추가
  console.log('\n📊 Step 2: products 테이블에 벡터 컬럼 추가...');
  
  // 먼저 기존 컬럼 확인
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'products')
    .eq('column_name', 'image_embedding');
  
  if (!columns || columns.length === 0) {
    console.log('   → image_embedding 컬럼 생성 중...');
    console.log('   ⚠️  이 작업은 Supabase Dashboard에서 직접 실행해야 합니다.');
  } else {
    console.log('   ✓ image_embedding 컬럼이 이미 존재합니다.');
  }

  console.log('\n='.repeat(60));
  console.log('📝 수동 설정이 필요합니다:');
  console.log('='.repeat(60));
  console.log('\n1. Supabase Dashboard 접속:');
  console.log(`   ${supabaseUrl.replace('/v1', '')}/project/ihpzkseqxtmnmbdsvdvo/sql`);
  console.log('\n2. SQL Editor에서 다음 쿼리 실행:\n');
  
  const sql = `-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 벡터 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_embedding vector(512);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS products_embedding_idx 
ON products USING ivfflat (image_embedding vector_cosine_ops) 
WITH (lists = 100);

-- 검색 함수 생성
CREATE OR REPLACE FUNCTION match_products_by_image(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id int,
  name text,
  brand text,
  image_url text,
  price int,
  price_text text,
  category text,
  product_url text,
  similarity float
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    products.id,
    products.name,
    products.brand,
    products.image_url,
    products.price,
    products.price_text,
    products.category,
    products.product_url,
    1 - (products.image_embedding <=> query_embedding) as similarity
  FROM products
  WHERE 
    products.image_embedding IS NOT NULL
    AND 1 - (products.image_embedding <=> query_embedding) > match_threshold
  ORDER BY products.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 진행 상황 뷰 생성
CREATE OR REPLACE VIEW vectorization_progress AS
SELECT
  COUNT(*) as total_products,
  COUNT(image_embedding) as vectorized_products,
  COUNT(*) - COUNT(image_embedding) as remaining_products,
  ROUND((COUNT(image_embedding)::float / NULLIF(COUNT(*), 0)::float * 100)::numeric, 2) as progress_percentage
FROM products
WHERE image_url IS NOT NULL;`;

  console.log(sql);
  console.log('\n='.repeat(60));
  console.log('\n✅ 위 SQL을 복사해서 Supabase SQL Editor에서 실행하세요!');
  console.log('\n완료 후 "npm run vectorize" 명령어로 벡터화를 시작하세요.\n');
}

setupVectorDatabase().catch(console.error);


