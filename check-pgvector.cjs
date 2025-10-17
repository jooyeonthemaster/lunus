const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path:'.env.local'});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPgvector() {
  console.log('🔍 pgvector 확장 확인\n');
  
  // SQL 직접 실행 (RPC로)
  const checkExtension = `
    SELECT extname, extversion 
    FROM pg_extension 
    WHERE extname = 'vector';
  `;
  
  console.log('pgvector 확장 자체는 Supabase Dashboard에서 확인해야 합니다.');
  console.log('Database → Extensions → "vector" 검색');
  console.log('\n');
  
  // 벡터 컬럼 타입 확인
  const {data: columnInfo, error} = await supabase
    .rpc('pg_typeof', {p: '(SELECT image_embedding FROM products LIMIT 1)'})
    .catch(() => ({data: null, error: 'RPC not available'}));
  
  console.log('벡터 컬럼 타입:', columnInfo || '확인 불가');
  
  // 간단한 벡터 연산 테스트
  console.log('\n🧪 벡터 연산 테스트...');
  const testQuery = `
    SELECT 
      '[1,2,3]'::vector(3) <=> '[4,5,6]'::vector(3) as distance,
      1 - ('[1,2,3]'::vector(3) <=> '[4,5,6]'::vector(3)) as similarity
  `;
  
  console.log('\nSupabase SQL Editor에서 다음 쿼리를 실행해보세요:');
  console.log(testQuery);
  console.log('\n만약 에러가 나면 pgvector가 설치되지 않은 것입니다!');
  
  process.exit(0);
}

checkPgvector().catch(console.error);


