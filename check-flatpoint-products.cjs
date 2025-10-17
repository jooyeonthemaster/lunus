const fs = require('fs');
const path = require('path');

// DOB.json 파일 읽기
const dobData = require('./data/플랫포인트/flatpoint-DOB.json');

console.log('📦 플랫포인트 DOB 제품 목록:\n');

if (dobData.products && Array.isArray(dobData.products)) {
  console.log(`총 ${dobData.products.length}개 제품\n`);

  dobData.products.slice(0, 10).forEach((product, index) => {
    console.log(`${index + 1}. ${product.name || product.productName || 'Unknown'}`);
    console.log(`   URL: ${product.url || product.productUrl || 'No URL'}`);
    console.log('');
  });

  if (dobData.products.length > 10) {
    console.log(`... 외 ${dobData.products.length - 10}개 제품`);
  }
} else {
  console.log('⚠️ products 배열을 찾을 수 없습니다.');
  console.log('데이터 구조:', Object.keys(dobData).slice(0, 10));
}
