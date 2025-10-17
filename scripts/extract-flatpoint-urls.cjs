const fs = require('fs');
const path = require('path');

console.log('🔍 플랫포인트 전체 제품 URL 추출 시작...\n');

const dataDir = path.join(__dirname, '..', 'data', '플랫포인트');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'products.json');

const allProducts = [];
let totalCount = 0;

console.log('📁 발견된 JSON 파일들:\n');

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 배열인 경우
  if (Array.isArray(data)) {
    console.log(`  - ${file}: ${data.length}개 제품`);
    data.forEach(product => {
      if (product.productUrl) {
        allProducts.push({
          title: product.title || product.productName || 'Unknown',
          price: product.price || 0,
          url: product.productUrl,
          category: file.replace('flatpoint-', '').replace('.json', ''),
          source: file,
          imageUrl: product.imageUrl || ''
        });
        totalCount++;
      }
    });
  }
  // 단일 객체인 경우
  else if (data.productUrl) {
    console.log(`  - ${file}: 1개 제품`);
    allProducts.push({
      title: data.title || data.productName || 'Unknown',
      price: data.price || 0,
      url: data.productUrl,
      category: file.replace('flatpoint-', '').replace('.json', ''),
      source: file,
      imageUrl: data.imageUrl || ''
    });
    totalCount++;
  }
});

console.log(`\n✅ 총 ${totalCount}개 제품 URL 추출 완료\n`);

// URL 목록 저장
const outputPath = path.join(__dirname, '..', 'flatpoint-all-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf8');

console.log(`📁 저장 경로: ${outputPath}\n`);

// 카테고리별 통계
const categoryStats = {};
allProducts.forEach(p => {
  categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
});

console.log('📊 카테고리별 제품 수:');
Object.entries(categoryStats).forEach(([category, count]) => {
  console.log(`  - ${category}: ${count}개`);
});

console.log('\n💡 다음 단계: node scripts/flatpoint-batch-scraper.cjs');
