const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 설정
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadProducts() {
  try {
    // JSON 파일 읽기
    const dataPath = path.join(__dirname, 'iloom_products.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const products = JSON.parse(rawData);

    console.log(`총 ${products.length}개의 제품을 Supabase에 업로드합니다...`);

    // Supabase 테이블에 데이터 삽입
    const { data, error } = await supabase
      .from('products') // 테이블 이름
      .insert(products);

    if (error) {
      console.error('업로드 중 오류 발생:', error);
      return;
    }

    console.log('✅ 성공적으로 업로드되었습니다!');
    console.log(`업로드된 제품 수: ${products.length}개`);
    
    // 업로드 확인
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand', '일룸')
      .eq('category', '침실');
    
    console.log(`Supabase에서 확인된 일룸 침실 제품: ${count}개`);
    
  } catch (err) {
    console.error('스크립트 실행 중 오류:', err);
  }
}

// 실행
uploadProducts();