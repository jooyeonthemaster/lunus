require('dotenv').config({path:'.env.local'});
const {createClient} = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // 초기에 성공했던 제품 확인
  console.log('=== 초기 성공 제품 (vectorization-log.json에서) ===');
  const fs = require('fs');
  const log = JSON.parse(fs.readFileSync('vectorization-log.json', 'utf8'));
  console.log('초기 성공 개수:', log.processed.length);

  const firstSuccessId = log.processed[0];
  console.log('첫 번째 성공 ID:', firstSuccessId);

  const { data: firstProduct } = await s
    .from('products')
    .select('id,image_url,image_embedding')
    .eq('id', firstSuccessId)
    .single();

  console.log('첫 번째 성공 제품 이미지 URL:', firstProduct.image_url);
  console.log('벡터 첫 5개 값:', firstProduct.image_embedding.slice(0, 5));
  console.log('');

  // 현재까지 벡터화된 총 개수
  const { count } = await s
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('image_embedding', 'is', null);

  console.log('=== 현재 상태 ===');
  console.log('총 벡터화된 제품:', count + '개');
  console.log('');

  // 최근 벡터화된 제품 5개
  console.log('=== 최근 벡터화된 제품 5개 ===');
  const { data: recent } = await s
    .from('products')
    .select('id,title,brand,image_url')
    .not('image_embedding', 'is', null)
    .order('id', {ascending: false})
    .limit(5);

  recent.forEach((p, i) => {
    console.log(`${i+1}. ${p.brand} - ${p.title.substring(0, 40)}`);
    console.log(`   URL: ${p.image_url.substring(0, 60)}...`);
  });

  process.exit(0);
}

check();
