/* 
 * ============================================
 * data/ 폴더의 모든 제품을 Supabase에 업로드
 * ============================================
 * 
 * 실행 방법:
 *   npm run upload:products
 * 
 * ============================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// JSON 파일 재귀적으로 찾기
function walkJsonFiles(startDir) {
  const out = [];
  const stack = [startDir];
  const ignore = new Set(['node_modules', '.next', '.git']);
  
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    
    try { 
      entries = fs.readdirSync(dir); 
    } catch { 
      continue; 
    }
    
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat;
      
      try { 
        stat = fs.statSync(full); 
      } catch { 
        continue; 
      }
      
      if (stat.isDirectory()) {
        if (!ignore.has(entry)) stack.push(full);
      } else if (entry.toLowerCase().endsWith('.json') && entry !== 'products.json') {
        // products.json은 제외 (통합 파일)
        out.push(full);
      }
    }
  }
  
  return out;
}

// 숫자 파싱
function parseNumber(n) {
  if (n == null) return null;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string') {
    const only = n.replace(/[^0-9]/g, '');
    if (only.length === 0) return null;
    const parsed = parseInt(only, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function uploadAllProducts() {
  console.log('🚀 data/ 폴더의 모든 제품을 Supabase에 업로드 시작\n');
  console.log('='.repeat(60));

  const dataDir = path.join(process.cwd(), 'data');
  const files = walkJsonFiles(dataDir);
  
  console.log(`📂 발견된 JSON 파일: ${files.length}개`);
  
  const allProducts = [];
  const seen = new Set();
  let globalIndex = 0;
  
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const json = JSON.parse(raw);
      
      if (!Array.isArray(json)) continue;
      
      const relPath = path.relative(dataDir, file);
      const segs = relPath.split(path.sep);
      const group = segs.length > 1 ? segs[0] : 'root';
      const fileBase = path.basename(file);
      const fileNameNoExt = fileBase.replace(/\.json$/i, '');
      
      let categoryFromFile = null;
      const dashIdx = fileNameNoExt.indexOf('-');
      if (dashIdx >= 0 && dashIdx < fileNameNoExt.length - 1) {
        categoryFromFile = fileNameNoExt.slice(dashIdx + 1);
      } else {
        categoryFromFile = fileNameNoExt;
      }
      
      console.log(`  📄 처리 중: ${relPath} (${json.length}개 제품)`);
      
      for (const item of json) {
        const title = (item.title || item.name || '').trim();
        const image_url = item.imageUrl || item.image_url || '';
        const url = item.productUrl || item.url || '';
        const brand = group || item.brand || '';
        const price = parseNumber(item.price || item.priceText) || 0;
        const category = item.category || categoryFromFile || '기타';
        
        // 중복 체크 (image_url 기준)
        const uniqueKey = image_url || url || `${title}|${brand}|${globalIndex}`;
        if (!uniqueKey) continue;
        
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);
        
        // 완전히 고유한 ID 생성 (globalIndex 포함)
        globalIndex++;
        const id = `${brand}-${globalIndex}-${Buffer.from(uniqueKey).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
        
        allProducts.push({
          id,
          source: group,
          url: url || null,
          brand,
          title: title || '제품명 없음',
          category,
          price,
          currency: 'KRW',
          image_url: image_url || null,
          image_path: null
        });
      }
    } catch (error) {
      console.error(`  ✗ 파일 처리 실패: ${file}`, error.message);
    }
  }
  
  console.log(`\n📊 총 수집된 제품: ${allProducts.length}개`);
  console.log(`🔄 Supabase에 업로드 시작...\n`);
  
  // 배치로 업로드 (1000개씩)
  const batchSize = 1000;
  let uploaded = 0;
  let failed = 0;
  
  for (let i = 0; i < allProducts.length; i += batchSize) {
    const batch = allProducts.slice(i, i + batchSize);
    console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}: ${batch.length}개 제품 업로드 중...`);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch, {
        ignoreDuplicates: true  // 중복은 무시
      });
    
    if (error) {
      console.error(`  ✗ 업로드 실패:`, error.message);
      failed += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`  ✓ ${batch.length}개 업로드 완료`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 업로드 완료!');
  console.log('='.repeat(60));
  console.log(`✅ 성공: ${uploaded}개`);
  console.log(`❌ 실패: ${failed}개`);
  console.log('='.repeat(60));
  
  // 확인
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Supabase 총 제품 수: ${count}개`);
  console.log('\n💡 다음 단계: npm run vectorize 실행하여 벡터화 시작!\n');
}

uploadAllProducts()
  .then(() => {
    console.log('✅ 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 치명적 오류:', error);
    process.exit(1);
  });

