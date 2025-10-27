const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🧹 LUNUS 제품 데이터 정제 스크립트');
console.log('='.repeat(60));

// 1. 원본 데이터 읽기
const dataPath = path.join(__dirname, 'data', 'premium-brands-unified.json');
const data = require(dataPath);

console.log(`\n📂 원본 데이터 로드 완료: ${data.length}개 제품\n`);

// 2. 백업 생성
const backupPath = path.join(__dirname, 'data', `premium-brands-unified.backup.${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`✅ 백업 생성 완료: ${path.basename(backupPath)}\n`);

// 3. 제거할 데이터 카운터
const removed = {
  zeroPrice: 0,
  iloomCategories: 0,
  iloomDoors: 0,
  iloomLighting: 0,
  emptyTitle: 0,
  emptyUrl: 0,
  invalidUrl: 0,
  total: 0
};

// 4. 가격 보정이 필요한 제품 카운터
const corrected = {
  iloomLighting: 0
};

console.log('🔍 데이터 정제 시작...\n');

// 5. 데이터 필터링 및 보정
const cleaned = data.filter((product, index) => {
  // 제품명이 비어있는 경우
  if (!product.title || product.title.trim() === '') {
    removed.emptyTitle++;
    console.log(`❌ [${index}] 제품명 없음 제거: ${product.productUrl}`);
    return false;
  }

  // URL이 비어있는 경우
  if (!product.productUrl || product.productUrl.trim() === '') {
    removed.emptyUrl++;
    console.log(`❌ [${index}] URL 없음 제거: ${product.title}`);
    return false;
  }

  // 일룸 카테고리 페이지 제거
  if (product.brand === '일룸') {
    // 카테고리 리스트 페이지
    if (product.productUrl.includes('/product/list.do?categoryNo=')) {
      removed.iloomCategories++;
      console.log(`❌ [${index}] 일룸 카테고리 페이지 제거: ${product.title}`);
      return false;
    }

    // 카테고리 아이템 페이지 (제품 상세가 아닌 경우)
    if (product.productUrl.includes('/product/item.do?categoryNo=')) {
      removed.iloomCategories++;
      console.log(`❌ [${index}] 일룸 카테고리 페이지 제거: ${product.title}`);
      return false;
    }

    // 옷장 도어 제품 (2원~24원)
    if (product.title.includes('도어') && product.price > 0 && product.price < 100) {
      removed.iloomDoors++;
      console.log(`❌ [${index}] 일룸 옷장 도어 제거: ${product.title} (${product.price}원)`);
      return false;
    }
  }

  // 인아트 빈 데이터 (URL에 no= 뒤에 값이 없는 경우)
  if (product.brand === '인아트' && product.productUrl.endsWith('no=')) {
    removed.invalidUrl++;
    console.log(`❌ [${index}] 인아트 빈 URL 제거: ${product.title}`);
    return false;
  }

  // 한샘 맞춤설계 제품 (가격이 0원인 경우)
  if (product.brand === '한샘' && product.price === 0 && product.title.includes('맞춤설계')) {
    removed.zeroPrice++;
    console.log(`❌ [${index}] 한샘 맞춤설계 제거: ${product.title}`);
    return false;
  }

  // 우아미 0원 제품 제거
  if (product.brand === '우아미' && product.price === 0) {
    removed.zeroPrice++;
    console.log(`❌ [${index}] 우아미 0원 제품 제거: ${product.title}`);
    return false;
  }

  // 기타 0원 제품 제거
  if (product.price === 0) {
    removed.zeroPrice++;
    console.log(`❌ [${index}] 0원 제품 제거: [${product.brand}] ${product.title}`);
    return false;
  }

  return true;
});

// 6. 일룸 조명 가격 보정 (1000배)
cleaned.forEach((product, index) => {
  if (product.brand === '일룸' && product.category === '조명' && product.price > 0 && product.price < 1000) {
    const oldPrice = product.price;
    product.price = product.price * 1000;
    corrected.iloomLighting++;
    console.log(`🔧 [${index}] 일룸 조명 가격 보정: ${product.title} (${oldPrice}원 → ${product.price.toLocaleString()}원)`);
  }
});

// 7. 총 제거 개수 계산
removed.total = removed.zeroPrice + removed.iloomCategories + removed.iloomDoors +
                removed.emptyTitle + removed.emptyUrl + removed.invalidUrl;

// 8. 결과 저장
const cleanedPath = path.join(__dirname, 'data', 'premium-brands-unified.json');
fs.writeFileSync(cleanedPath, JSON.stringify(cleaned, null, 2), 'utf-8');

console.log('\n' + '='.repeat(60));
console.log('📊 정제 결과');
console.log('='.repeat(60));
console.log(`원본 제품 수: ${data.length}개`);
console.log(`정제 후 제품 수: ${cleaned.length}개`);
console.log(`제거된 제품 수: ${removed.total}개\n`);

console.log('📉 제거 내역:');
console.log(`  - 0원 제품: ${removed.zeroPrice}개`);
console.log(`  - 일룸 카테고리 페이지: ${removed.iloomCategories}개`);
console.log(`  - 일룸 옷장 도어: ${removed.iloomDoors}개`);
console.log(`  - 제품명 없음: ${removed.emptyTitle}개`);
console.log(`  - URL 없음: ${removed.emptyUrl}개`);
console.log(`  - 잘못된 URL: ${removed.invalidUrl}개\n`);

console.log('🔧 가격 보정:');
console.log(`  - 일룸 조명 가격 수정: ${corrected.iloomLighting}개 (x1000 적용)\n`);

console.log('='.repeat(60));
console.log('✅ 데이터 정제 완료!');
console.log('='.repeat(60));
console.log(`저장 위치: ${cleanedPath}`);
console.log(`백업 위치: ${backupPath}\n`);

// 9. 정제 후 통계
const stats = {
  total: cleaned.length,
  brands: {},
  categories: {},
  priceStats: {
    min: Math.min(...cleaned.map(p => p.price)),
    max: Math.max(...cleaned.map(p => p.price)),
    avg: Math.round(cleaned.reduce((sum, p) => sum + p.price, 0) / cleaned.length)
  }
};

// 브랜드별 통계
cleaned.forEach(p => {
  if (!stats.brands[p.brand]) {
    stats.brands[p.brand] = 0;
  }
  stats.brands[p.brand]++;

  if (!stats.categories[p.category]) {
    stats.categories[p.category] = 0;
  }
  stats.categories[p.category]++;
});

console.log('📈 정제 후 통계:');
console.log(`  최저가: ${stats.priceStats.min.toLocaleString()}원`);
console.log(`  최고가: ${stats.priceStats.max.toLocaleString()}원`);
console.log(`  평균가: ${stats.priceStats.avg.toLocaleString()}원\n`);

console.log('🏪 브랜드별 제품 수:');
Object.entries(stats.brands)
  .sort((a, b) => b[1] - a[1])
  .forEach(([brand, count]) => {
    console.log(`  ${brand}: ${count}개`);
  });

console.log('\n' + '='.repeat(60));
console.log('🎉 완료! 다음 명령어로 확인하세요:');
console.log('   node analyze-prices.cjs');
console.log('='.repeat(60));
