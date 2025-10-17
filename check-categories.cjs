const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path:'.env.local'});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCategories() {
  // 벡터화된 제품들
  const {data} = await supabase
    .from('products')
    .select('category, title')
    .not('image_embedding','is',null);
  
  const counts = {};
  data.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  
  console.log('\n벡터화된 제품 카테고리별 분포:');
  console.log('='.repeat(50));
  Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(20)} : ${count}개`);
    });
  
  console.log('\n총 벡터화된 제품:', data.length, '개');
  
  process.exit(0);
}

checkCategories();


