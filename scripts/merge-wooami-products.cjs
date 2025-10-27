/*
  우아미 카테고리별 파일을 products.json으로 병합
  - wooami-거실소파.json, wooami-거실장.json 등을 읽어서
  - products.json으로 통합
*/

const fs = require('fs');
const path = require('path');

const brandDir = path.join(process.cwd(), 'data', '우아미');

console.log('🚀 우아미 제품 데이터 병합 시작...\n');

// 카테고리별 파일 찾기
const categoryFiles = fs.readdirSync(brandDir).filter(f => 
  f.startsWith('wooami-') && f.endsWith('.json') && f !== 'products.json'
);

console.log(`📂 발견된 카테고리 파일: ${categoryFiles.length}개`);
categoryFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

// 모든 제품 병합
const allProducts = [];
let totalCount = 0;

for (const file of categoryFiles) {
  const filePath = path.join(brandDir, file);
  try {
    const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n✅ ${file}: ${products.length}개 제품`);
    
    // detailImages가 있는 제품 수 확인
    const withDetails = products.filter(p => p.detailImages && p.detailImages.length > 0).length;
    console.log(`   상세 이미지 있음: ${withDetails}개`);
    
    allProducts.push(...products);
    totalCount += products.length;
  } catch (err) {
    console.error(`❌ ${file} 읽기 실패:`, err.message);
  }
}

// products.json에 저장
const outputPath = path.join(brandDir, 'products.json');
fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf8');

console.log('\n' + '='.repeat(60));
console.log('✅ 병합 완료!');
console.log('='.repeat(60));
console.log(`📊 총 제품 수: ${totalCount}개`);
console.log(`💾 저장 위치: ${outputPath}`);
console.log('\n💡 이제 상세 페이지에서 상세 이미지를 확인할 수 있습니다!');





