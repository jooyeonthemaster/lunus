const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path:'.env.local'});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVectorFormat() {
  // 가장 최근에 벡터화된 제품 가져오기
  const {data} = await supabase
    .from('products')
    .select('*')
    .not('image_embedding', 'is', null)
    .order('id', {ascending: false})
    .limit(1)
    .single();
  
  console.log('📦 제품:', data.title);
  console.log('📦 벡터 타입:', typeof data.image_embedding);
  console.log('📦 벡터 길이:', data.image_embedding.length);
  console.log('📦 벡터 샘플 (처음 100자):', JSON.stringify(data.image_embedding).substring(0, 100));
  
  // 벡터가 문자열인지 배열인지 확인
  if (typeof data.image_embedding === 'string') {
    console.log('\n⚠️  벡터가 문자열로 저장되어 있습니다!');
    console.log('해결: pgvector는 문자열을 자동으로 vector 타입으로 변환합니다.');
  } else if (Array.isArray(data.image_embedding)) {
    console.log('\n⚠️  벡터가 배열로 저장되어 있습니다!');
    console.log('벡터 요소 개수:', data.image_embedding.length);
  }
  
  process.exit(0);
}

checkVectorFormat().catch(console.error);


