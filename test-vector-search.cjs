const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path:'.env.local'});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testVectorSearch() {
  console.log('🔍 벡터 검색 테스트\n');
  
  // 1. 벡터화된 제품 1개 가져오기
  const {data: testProduct} = await supabase
    .from('products')
    .select('*')
    .not('image_embedding', 'is', null)
    .limit(1)
    .single();
  
  console.log('📦 테스트 제품:', testProduct.title, `(${testProduct.category})`);
  console.log('📦 벡터 차원:', testProduct.image_embedding.length);
  
  // 2. 이 제품의 벡터로 유사 제품 검색
  console.log('\n🔍 RPC 함수로 유사 제품 검색 중...\n');
  
  const {data: results, error} = await supabase
    .rpc('match_products_by_image', {
      query_embedding: testProduct.image_embedding,
      match_threshold: 0.4,
      match_count: 10
    });
  
  if (error) {
    console.error('❌ RPC 에러:', error);
    process.exit(1);
  }
  
  console.log('✅ 검색 결과:', results.length, '개\n');
  console.log('📋 상위 10개 결과:');
  console.log('='.repeat(80));
  
  results.forEach((p, i) => {
    const sim = (p.similarity * 100).toFixed(1);
    console.log(`${(i+1).toString().padStart(2)}. [${sim}%] ${p.title.substring(0, 40).padEnd(40)} - ${p.category}`);
  });
  
  console.log('='.repeat(80));
  
  // 3. 카테고리별 분포 확인
  const categoryCount = {};
  results.forEach(p => {
    categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
  });
  
  console.log('\n📊 카테고리 분포:');
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}개`);
  });
  
  process.exit(0);
}

testVectorSearch().catch(console.error);


